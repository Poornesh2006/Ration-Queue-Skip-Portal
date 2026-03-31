import QRCode from "qrcode";
import { Booking } from "../models/Booking.js";
import { Product } from "../models/Product.js";
import { Shop } from "../models/Shop.js";
import { Slot } from "../models/Slot.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPriorityCategory } from "../services/slotEngine.js";
import { sendResponse } from "../utils/sendResponse.js";
import { createAuditLog } from "../services/auditService.js";
import { sendNotification } from "../services/notificationService.js";
import { calculateEntitlement } from "../services/entitlementService.js";
import { generateUpiQrCode } from "../services/paymentService.js";
import { createHistoryEntry, getRequestContext, trackRequestHistory } from "../services/historyService.js";

const buildQrCodeData = async ({ bookingId, userId, rationCardNumber, items, date, slotTime }) => {
  const token = `SQSP-${bookingId}-${Date.now()}`;
  const qrPayload = {
    token,
    booking_id: bookingId,
    user_id: userId,
    ration_card_number: rationCardNumber,
    items,
    date,
    slot: slotTime,
  };
  const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
  return { token, qrCodeDataUrl, qrPayload };
};

const validatePriorityAccess = (slot, user) => {
  if (!slot.priorityOnly) {
    return;
  }

  const priorityCategory = getPriorityCategory(user);
  const allowed =
    slot.priorityCategory === priorityCategory || priorityCategory === "emergency";

  if (!allowed) {
    throw new ApiError(403, "This slot is reserved for higher-priority beneficiaries");
  }
};

const getDateBounds = (dateInput) => {
  const parsedDate = new Date(dateInput);
  const start = new Date(parsedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(parsedDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const toDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const isTrialBookingEnabled = () => process.env.ENABLE_TRIAL_BOOKING === "true";

const sanitizeRequestedItems = (items = []) =>
  items
    .filter((entry) => entry?.item && Number(entry?.quantity) > 0)
    .map((entry) => ({
      item: String(entry.item).trim().toLowerCase(),
      quantity: Number(entry.quantity),
    }));

const normalizeAllowedQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const validateRequestedItems = ({ user, shop, items }) => {
  if (!items.length) {
    return [];
  }

  const entitlement = calculateEntitlement(user);

  items.forEach(({ item, quantity }) => {
    const entitlementValue =
      item === "rice"
        ? entitlement.rice
        : item === "sugar"
          ? entitlement.sugar
          : item === "wheat"
            ? entitlement.wheat
            : item === "oil"
              ? entitlement.oil
              : item === "dal" || item === "dhal"
                ? entitlement.dal
                : item === "salt"
                  ? entitlement.salt
                : item === "kerosene"
                  ? entitlement.kerosene
                  : 0;

    const allowedQty = normalizeAllowedQuantity(entitlementValue);

    if (!allowedQty) {
      throw new ApiError(400, `${item} is not part of this card's entitlement`);
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new ApiError(400, `${item} quantity must be at least 1`);
    }

    if (quantity > allowedQty) {
      throw new ApiError(400, `${item} quantity exceeds your entitlement`);
    }

    const availableStock = shop.stock?.[item];
    if (typeof availableStock === "number" && quantity > availableStock) {
      throw new ApiError(400, `${item} quantity exceeds current stock`);
    }
  });

  return items;
};

const calculateOrderSummary = async (items) => {
  if (!items.length) {
    return {
      freeItems: [],
      paidItems: [],
      totalAmount: 0,
      paymentStatus: "waived",
      paymentRequired: false,
      productMap: new Map(),
    };
  }

  const products = await Product.find({
    category: { $in: items.map((entry) => entry.item) },
    isActive: true,
  }).lean();

  const productMap = new Map(products.map((product) => [product.category, product]));
  const freeItems = [];
  const paidItems = [];

  items.forEach((entry) => {
    const product = productMap.get(entry.item);
    const line = {
      ...entry,
      name: product?.name || entry.item,
      type: product?.type || "paid",
      unit: product?.unit || "kg",
      price: product?.price || 0,
      amount: Number(((product?.price || 0) * entry.quantity).toFixed(2)),
    };

    if (line.type === "free" || line.amount === 0) {
      freeItems.push(line);
      return;
    }

    paidItems.push(line);
  });

  const totalAmount = Number(
    paidItems.reduce((total, item) => total + item.amount, 0).toFixed(2)
  );

  return {
    freeItems,
    paidItems,
    totalAmount,
    paymentStatus: totalAmount > 0 ? "pending" : "waived",
    paymentRequired: totalAmount > 0,
    productMap,
  };
};

const createBookingRecord = async ({ actor, shopId, slotId, date, bookingSource, userId, items = [] }) => {
  const normalizedDate = new Date(date);
  const targetUser =
    bookingSource === "app" ? actor : await User.findById(userId || actor._id);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new ApiError(400, "A valid booking date is required");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const bookingDayStart = new Date(normalizedDate);
  bookingDayStart.setHours(0, 0, 0, 0);

  if (bookingDayStart < todayStart) {
    throw new ApiError(400, "Booking date cannot be in the past");
  }

  if (!targetUser) {
    throw new ApiError(404, "Booking user not found");
  }

  const [shop, slot] = await Promise.all([
    Shop.findById(shopId),
    Slot.findById(slotId),
  ]);

  if (!shop || !slot) {
    throw new ApiError(404, "Selected shop or slot does not exist");
  }

  if (slot.slotDate) {
    const slotDateKey = toDateKey(slot.slotDate);
    const bookingDateKey = toDateKey(normalizedDate);

    if (slotDateKey !== bookingDateKey) {
      throw new ApiError(400, "Selected slot does not belong to the chosen date");
    }
  }

  validatePriorityAccess(slot, targetUser);
  const requestedItems = validateRequestedItems({
    user: targetUser,
    shop,
    items: sanitizeRequestedItems(items),
  });
  const orderSummary = await calculateOrderSummary(requestedItems);

  const { start, end } = getDateBounds(normalizedDate);
  const existingBooking = await Booking.findOne({
    user: targetUser._id,
    date: { $gte: start, $lte: end },
    status: "booked",
  });

  if (existingBooking) {
    if (!isTrialBookingEnabled()) {
      throw new ApiError(409, "You already have a booking for this day");
    }

    await Promise.all([
      Booking.findByIdAndUpdate(existingBooking._id, { status: "cancelled" }),
      Slot.findByIdAndUpdate(existingBooking.slot, {
        $inc: { bookedCount: -1 },
      }),
    ]);
  }

  const slotBookings = await Booking.countDocuments({
    slot: slot._id,
    date: { $gte: start, $lte: end },
    status: "booked",
  });

  if (slotBookings >= slot.maxLimit) {
    throw new ApiError(409, "This slot is already full");
  }

  let slotReserved = false;
  let bookingRecord = null;

  try {
    const updatedSlot = await Slot.findOneAndUpdate(
      {
        _id: slot._id,
        $expr: { $lt: ["$bookedCount", "$maxLimit"] },
      },
      { $inc: { bookedCount: 1 } },
      { new: true }
    );

    if (!updatedSlot) {
      throw new ApiError(409, "This slot is already full");
    }
    slotReserved = true;

    bookingRecord = await Booking.create({
      user: targetUser._id,
      shop: shop._id,
      slot: slot._id,
      date: normalizedDate,
      bookingSource,
      requestedItems,
      totalAmount: orderSummary.totalAmount,
      paymentStatus: orderSummary.paymentStatus,
      receiptNumber: `RCT-${Date.now()}`,
    });

    const qrPayload = await buildQrCodeData({
      bookingId: bookingRecord._id.toString(),
      userId: targetUser._id.toString(),
      rationCardNumber: targetUser.rationCardNumber,
      items: requestedItems,
      date: normalizedDate.toISOString(),
      slotTime: slot.slotTime,
    });
    bookingRecord.qrCodeToken = qrPayload.token;
    bookingRecord.qrData = qrPayload.qrPayload;
    bookingRecord.qrCodeDataUrl = qrPayload.qrCodeDataUrl;
    await bookingRecord.save();

    const upiPayment =
      orderSummary.paymentRequired
        ? await generateUpiQrCode({
            amount: orderSummary.totalAmount,
            note: `Booking ${bookingRecord._id.toString()}`,
          })
        : null;

    const populatedBooking = await Booking.findById(bookingRecord._id)
      .populate("shop", "shopId shopName location")
      .populate("slot", "slotTime maxLimit bookedCount")
      .populate("user", "name rationCardNumber");

    await createAuditLog({
      entityType: "booking",
      entityId: bookingRecord._id.toString(),
      action: "created",
      actorId: actor?._id || null,
      payload: {
        userId: targetUser._id.toString(),
        shopId: shop._id.toString(),
        slotId: slot._id.toString(),
        bookingSource,
        requestedItems,
      },
    });

    sendNotification({
      title: "Booking confirmation",
      message: `Booking confirmed for ${targetUser.name} at ${slot.slotTime}`,
      user: targetUser,
    });

    await trackRequestHistory({
      req: {
        headers: actor?.headers || {},
        socket: actor?.socket || {},
        ip: actor?.ip || "",
        body: {
          deviceName: bookingSource === "kiosk" ? "Kiosk terminal" : "Citizen booking flow",
        },
      },
      userId: targetUser._id,
      actionType: "booking",
      details: {
        bookingId: bookingRecord._id.toString(),
        shopName: shop.shopName,
        slotTime: slot.slotTime,
        bookingSource,
        requestedItems,
        totalAmount: orderSummary.totalAmount,
        qrCodeToken: qrPayload.token,
      },
    });

    return {
      message:
        bookingSource === "kiosk"
          ? "Kiosk booking confirmed and SMS simulation triggered"
          : "Booking confirmed. Notification sent to citizen dashboard.",
      notification: `Booking Confirmed for ${targetUser.name} on ${slot.slotTime}`,
      booking: populatedBooking,
      qrCodeToken: qrPayload.token,
      qrCodeDataUrl: qrPayload.qrCodeDataUrl,
      qrPayload: qrPayload.qrPayload,
      entitlement: calculateEntitlement(targetUser),
      freeItems: orderSummary.freeItems,
      paidItems: orderSummary.paidItems,
      totalAmount: orderSummary.totalAmount,
      paymentStatus: orderSummary.paymentStatus,
      paymentRequired: orderSummary.paymentRequired,
      upiLink: upiPayment?.upiLink || null,
      upiQrCodeDataUrl: upiPayment?.qrCodeDataUrl || null,
    };
  } catch (error) {
    if (slotReserved) {
      await Slot.findByIdAndUpdate(slot._id, { $inc: { bookedCount: -1 } });
    }

    if (bookingRecord?._id) {
      await Booking.findByIdAndDelete(bookingRecord._id);
    }

    if (error?.code === 11000) {
      throw new ApiError(
        409,
        isTrialBookingEnabled()
          ? "Trial booking was refreshed. Please choose a slot again."
          : "You already have a booking for this day"
      );
    }

    throw error instanceof ApiError ? error : new ApiError(500, error.message || "Booking failed");
  }
};

export const createBooking = asyncHandler(async (req, res) => {
  const response = await createBookingRecord({
    actor: { _id: req.user._id, headers: req.headers, socket: req.socket, ip: req.ip },
    ...req.body,
    bookingSource: req.body.bookingSource || "app",
  });

  sendResponse(res, 201, response.message, {
    notification: response.notification,
    booking: response.booking,
    qrCodeToken: response.qrCodeToken,
    qrCodeDataUrl: response.qrCodeDataUrl,
    qrPayload: response.qrPayload,
    entitlement: response.entitlement,
    freeItems: response.freeItems,
    paidItems: response.paidItems,
    totalAmount: response.totalAmount,
    paymentStatus: response.paymentStatus,
    paymentRequired: response.paymentRequired,
    upiLink: response.upiLink,
    upiQrCodeDataUrl: response.upiQrCodeDataUrl,
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find({ user: req.user._id })
    .populate("shop", "shopId shopName location")
    .populate("slot", "slotTime maxLimit")
    .populate("user", "name rationCardNumber")
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit),
    Booking.countDocuments({ user: req.user._id }),
  ]);

  sendResponse(res, 200, "Bookings fetched successfully", {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

export const getUserBookingHistory = asyncHandler(async (req, res) => {
  const [bookings, total] = await Promise.all([
    Booking.find({ user: req.user._id })
      .populate("shop", "shopId shopName location")
      .populate("slot", "slotTime maxLimit")
      .populate("user", "name rationCardNumber")
      .sort({ date: -1, createdAt: -1 })
      .limit(50),
    Booking.countDocuments({ user: req.user._id }),
  ]);

  sendResponse(res, 200, "User booking history fetched successfully", {
    bookings,
    total,
  });
});

export const createManualBooking = asyncHandler(async (req, res) => {
  const { rationCardNumber, shopId, slotId, date } = req.body;
  const targetUser = await User.findOne({ rationCardNumber });

  if (!targetUser) {
    throw new ApiError(404, "Citizen not found for kiosk booking");
  }

  const response = await createBookingRecord({
    actor: { _id: req.user._id, headers: req.headers, socket: req.socket, ip: req.ip },
    shopId,
    slotId,
    date,
    bookingSource: "kiosk",
    userId: targetUser._id,
  });

  sendResponse(res, 201, response.message, {
    notification: response.notification,
    booking: response.booking,
    qrCodeToken: response.qrCodeToken,
    qrCodeDataUrl: response.qrCodeDataUrl,
    qrPayload: response.qrPayload,
    entitlement: response.entitlement,
    freeItems: response.freeItems,
    paidItems: response.paidItems,
    totalAmount: response.totalAmount,
    paymentStatus: response.paymentStatus,
    paymentRequired: response.paymentRequired,
    upiLink: response.upiLink,
    upiQrCodeDataUrl: response.upiQrCodeDataUrl,
  });
});

export const verifyBookingQr = asyncHandler(async (req, res) => {
  const { qrCodeToken } = req.body;
  const booking = await Booking.findOne({ qrCodeToken })
    .populate("user", "name rationCardNumber")
    .populate("shop", "shopName")
    .populate("slot", "slotTime");

  if (!booking) {
    throw new ApiError(404, "Invalid or expired QR code");
  }

  await createAuditLog({
    entityType: "booking",
    entityId: booking._id.toString(),
    action: "qr_verified",
    actorId: req.user?._id || null,
    payload: {
      qrCodeToken,
      verifiedAt: new Date().toISOString(),
    },
  });

  sendResponse(res, 200, "QR verified successfully", { booking });
});

export const confirmBookingPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate(
    "user",
    "name rationCardNumber"
  );

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  const isOwner = booking.user._id.toString() === req.user._id.toString();
  const isPrivileged = ["admin", "shop_owner"].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, "You are not allowed to confirm payment for this booking");
  }

  if (booking.paymentStatus === "paid") {
    sendResponse(res, 200, "Payment already confirmed", {
      booking,
      paymentStatus: booking.paymentStatus,
      transactionId: booking.transactionId,
    });
    return;
  }

  booking.paymentStatus = booking.totalAmount > 0 ? "paid" : "waived";
  booking.transactionId = req.body.transactionId || `TXN-${Date.now()}`;
  await booking.save();

  const historyContext = getRequestContext(req);
  await createHistoryEntry({
    userId: booking.user._id,
    actionType: "purchase",
    details: {
      bookingId: booking._id.toString(),
      items: booking.requestedItems || [],
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      transactionId: booking.transactionId,
      slotTime: booking.slot?.slotTime,
      date: booking.date,
      qrCodeToken: booking.qrCodeToken,
    },
    ...historyContext,
  });

  sendResponse(res, 200, "Payment recorded successfully", {
    booking,
    paymentStatus: booking.paymentStatus,
    transactionId: booking.transactionId,
  });
});

export const markBookingDelivered = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate("user", "name rationCardNumber")
    .populate("shop", "shopName")
    .populate("slot", "slotTime");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status === "completed") {
    sendResponse(res, 200, "Booking already marked as delivered", { booking });
    return;
  }

  if (booking.totalAmount > 0 && booking.paymentStatus !== "paid") {
    throw new ApiError(400, "Payment must be completed before delivery");
  }

  booking.status = "completed";
  booking.deliveredAt = new Date();
  await booking.save();

  await createAuditLog({
    entityType: "booking",
    entityId: booking._id.toString(),
    action: "delivered",
    actorId: req.user?._id || null,
    payload: {
      deliveredAt: booking.deliveredAt,
      paymentStatus: booking.paymentStatus,
    },
  });

  sendResponse(res, 200, "Booking marked as delivered", { booking });
});
