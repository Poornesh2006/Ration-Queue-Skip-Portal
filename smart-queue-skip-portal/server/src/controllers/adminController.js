import { ArchiveRecord } from "../models/ArchiveRecord.js";
import { AuditLog } from "../models/AuditLog.js";
import { Booking } from "../models/Booking.js";
import { Fraud } from "../models/Fraud.js";
import { Grievance } from "../models/Grievance.js";
import { History } from "../models/History.js";
import { Product } from "../models/Product.js";
import { Shop } from "../models/Shop.js";
import { Slot } from "../models/Slot.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { calculateEntitlement } from "../services/entitlementService.js";
import { runFraudDetection } from "../services/fraudDetection.js";
import { sendNotification, sendStockAvailabilityNotification } from "../services/notificationService.js";
import { verifyIdentityPayload } from "../services/verificationService.js";
import { getDemandInsights, predictDemandForDate } from "../services/demandPrediction.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAuditLog } from "../services/auditService.js";
import { generateToken } from "../utils/generateToken.js";
import { sendResponse } from "../utils/sendResponse.js";
import { generateCsvReport, generatePdfReport } from "../services/reportService.js";
import { trackRequestHistory } from "../services/historyService.js";

const CORE_STOCK_ITEMS = ["rice", "wheat", "sugar", "kerosene"];
const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 200;

const getDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const buildStockAlerts = (shops, products = []) => [
  ...shops.flatMap((shop) =>
    CORE_STOCK_ITEMS.flatMap((item) => {
      const initial = shop.initialStock?.[item] || 0;
      const current = shop.stock?.[item] || 0;

      if (initial > 0 && current / initial < 0.35) {
        return [
          {
            type: "shop",
            shopId: shop.shopId,
            shopName: shop.shopName,
            item,
            initial,
            current,
            severity: "high",
            reason: "Stock dropped below 35% of seeded baseline",
          },
        ];
      }

      return [];
    })
  ),
  ...products
    .filter((product) => product.stockAvailable <= product.reorderLevel)
    .map((product) => ({
      type: "product",
      productId: product._id,
      productName: product.name,
      item: product.category,
      current: product.stockAvailable,
      initial: product.reorderLevel,
      severity: "medium",
      reason: "Product stock reached reorder level",
    })),
];

const buildBookingHeatmap = (bookings) =>
  Object.entries(
    bookings.reduce((acc, booking) => {
      const slotTime = booking.slot?.slotTime || "Unknown";
      acc[slotTime] = (acc[slotTime] || 0) + 1;
      return acc;
    }, {})
  ).map(([slotTime, bookingsCount]) => ({
    slotTime,
    bookingsCount,
  }));

const buildUsageSeries = (bookings, transactions) => {
  const usageMap = {};

  bookings.forEach((booking) => {
    const key = getDateKey(booking.date);
    usageMap[key] = usageMap[key] || { date: key, bookings: 0, transactions: 0 };
    usageMap[key].bookings += 1;
  });

  transactions.forEach((transaction) => {
    const key = getDateKey(transaction.transactionDate);
    usageMap[key] = usageMap[key] || { date: key, bookings: 0, transactions: 0 };
    usageMap[key].transactions += 1;
  });

  return Object.values(usageMap)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10);
};

const buildQueueStatus = (slots) =>
  slots.map((slot) => ({
    slotId: slot._id,
    slotTime: slot.slotTime,
    date: slot.date,
    bookedCount: slot.bookedCount,
    maxLimit: slot.maxLimit,
    fillRate: slot.maxLimit ? Number(((slot.bookedCount / slot.maxLimit) * 100).toFixed(1)) : 0,
    overbooked: slot.bookedCount > slot.maxLimit,
    predictedDemand: slot.predictedDemand || 0,
  }));

const buildPeakHours = (historyEntries = []) =>
  Array.from({ length: 24 }, (_, hour) => {
    const count = historyEntries.filter(
      (entry) => new Date(entry.timestamp).getHours() === hour
    ).length;

    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      activityCount: count,
    };
  });

const buildItemDistribution = (transactions = []) => {
  const distribution = transactions.reduce((acc, transaction) => {
    (transaction.items || []).forEach((item) => {
      acc[item.item] = (acc[item.item] || 0) + item.quantity;
    });
    return acc;
  }, {});

  return Object.entries(distribution).map(([item, quantity]) => ({
    item,
    quantity,
  }));
};

const buildActionSeries = (historyEntries = []) => {
  const grouped = historyEntries.reduce((acc, entry) => {
    const key = getDateKey(entry.timestamp);
    acc[key] = acc[key] || { date: key, login: 0, logout: 0, booking: 0, purchase: 0 };
    acc[key][entry.actionType] += 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10);
};

const persistFraudInsights = async ({ users, bookings, transactions, shops, histories }) => {
  const analysis = runFraudDetection({ users, bookings, transactions, shops, histories });

  const userOps = analysis.suspiciousUsers.map((entry) => ({
    updateOne: {
      filter: { entityType: "user", user: entry.userId },
      update: {
        $set: {
          score: entry.fraudScore,
          reasons: entry.reasons,
          explainability: entry.explainability || [],
          metadata: {
            rationCardNumber: entry.rationCardNumber,
            priorityCategory: entry.priorityCategory,
          },
          status: "open",
          lastDetectedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const dealerOps = analysis.suspiciousDealers.map((entry) => ({
    updateOne: {
      filter: { entityType: "shop", shop: entry.shopId },
      update: {
        $set: {
          score: entry.dealerFraudScore,
          reasons: entry.reasons,
          explainability: entry.reasons.map((reason) => ({
            label: reason,
            impact: "high",
          })),
          metadata: {
            dealerName: entry.dealerName,
            shopCode: entry.shopCode,
          },
          status: "open",
          lastDetectedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (userOps.length || dealerOps.length) {
    await Fraud.bulkWrite([...userOps, ...dealerOps]);
  }

  await Promise.all([
    ...analysis.suspiciousUsers.map((entry) =>
      User.findByIdAndUpdate(entry.userId, {
        flagged: true,
        fraudScore: entry.fraudScore,
      })
    ),
    ...analysis.suspiciousDealers.map((entry) =>
      Shop.findByIdAndUpdate(entry.shopId, {
        fraudScore: entry.dealerFraudScore,
      })
    ),
  ]);

  return analysis;
};

const createArchiveSnapshot = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthlyStart = new Date(year, month - 1, 1);
  const monthlyEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const yearlyStart = new Date(year, 0, 1);
  const yearlyEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const [shops, monthlyBookings, monthlyTransactions, yearlyBookings, yearlyTransactions, fraudCases, blockedUsers] =
    await Promise.all([
      Shop.find().lean(),
      Booking.find({ date: { $gte: monthlyStart, $lte: monthlyEnd } }).populate("slot", "slotTime"),
      Transaction.find({ transactionDate: { $gte: monthlyStart, $lte: monthlyEnd } }),
      Booking.find({ date: { $gte: yearlyStart, $lte: yearlyEnd } }).populate("slot", "slotTime"),
      Transaction.find({ transactionDate: { $gte: yearlyStart, $lte: yearlyEnd } }),
      Fraud.countDocuments({ status: "open" }),
      User.countDocuments({ isBlocked: true }),
    ]);

  const stockHistory = shops.map((shop) => ({
    shopId: shop.shopId,
    shopName: shop.shopName,
    stock: shop.stock,
    capturedAt: now,
  }));

  const monthlyPayload = {
    totals: {
      bookings: monthlyBookings.length,
      transactions: monthlyTransactions.length,
      fraudCases,
      blockedUsers,
    },
    queuePeaks: buildBookingHeatmap(monthlyBookings),
    stockHistory,
  };

  const yearlyPayload = {
    totals: {
      bookings: yearlyBookings.length,
      transactions: yearlyTransactions.length,
      fraudCases,
      blockedUsers,
    },
    queuePeaks: buildBookingHeatmap(yearlyBookings),
    stockHistory,
  };

  await Promise.all([
    ArchiveRecord.findOneAndUpdate(
      { periodType: "monthly", year, month },
      { $set: monthlyPayload },
      { upsert: true, new: true }
    ),
    ArchiveRecord.findOneAndUpdate(
      { periodType: "yearly", year },
      { $set: yearlyPayload, $unset: { month: "" } },
      { upsert: true, new: true }
    ),
  ]);
};

const loadAdminData = async () => {
  await predictDemandForDate(new Date());

  const [users, bookings, shops, transactions, grievances, demandInsights, products, slots, auditLogs, histories] =
    await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }),
      Booking.find()
        .populate("user", "name rationCardNumber role")
        .populate("shop", "shopId shopName location")
        .populate("slot", "slotTime")
        .sort({ date: -1 }),
      Shop.find().sort({ shopName: 1 }),
      Transaction.find()
        .populate("user", "name rationCardNumber")
        .populate("shop", "shopId shopName")
        .sort({ transactionDate: -1 }),
      Grievance.find().populate("user", "name rationCardNumber").sort({ createdAt: -1 }),
      getDemandInsights(new Date()),
      Product.find().sort({ category: 1, name: 1 }),
      Slot.find().sort({ date: 1, slotTime: 1 }),
      AuditLog.find().sort({ createdAt: -1 }).limit(12),
      History.find()
        .populate("user", "name rationCardNumber")
        .sort({ timestamp: -1 })
        .limit(500),
    ]);

  const suspiciousTransactions = await Transaction.aggregate([
    {
      $group: {
        _id: {
          user: "$user",
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" },
          },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 3 } } },
    {
      $lookup: {
        from: "users",
        localField: "_id.user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        date: "$_id.day",
        count: 1,
        userId: "$user._id",
        userName: "$user.name",
        rationCardNumber: "$user.rationCardNumber",
        reason: {
          $literal: "More than 3 transactions recorded for a single day",
        },
      },
    },
  ]);

  const fraudAnalysis = await persistFraudInsights({
    users,
    bookings,
    transactions,
    shops,
    histories,
  });

  await createArchiveSnapshot();

  const archives = await ArchiveRecord.find().sort({ year: -1, month: -1 }).limit(6);

  return {
    users,
    bookings,
    shops,
    transactions,
    suspiciousTransactions,
    grievances,
    demandInsights,
    products,
    slots,
    auditLogs,
    archives,
    fraudAnalysis,
    histories,
  };
};

export const adminLogin = asyncHandler(async (req, res) => {
  const adminId = (req.body.adminId || req.body.rationCardNumber || "").toUpperCase();
  const { password } = req.body;

  const user = await User.findOne({ rationCardNumber: adminId }).select("+password");

  if (!user || user.role !== "admin" || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid admin ID or password");
  }

  user.lastLoginAt = new Date();
  await user.save();
  await trackRequestHistory({
    req,
    userId: user._id,
    actionType: "login",
    details: {
      method: "admin-password",
      role: user.role,
      rationCardNumber: user.rationCardNumber,
    },
  });

  sendResponse(res, 200, "Admin login successful", {
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      rationCardNumber: user.rationCardNumber,
      role: user.role,
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      entitlement: calculateEntitlement(user),
    },
  });
});

export const getAdminOverview = asyncHandler(async (_req, res) => {
  const {
    users,
    bookings,
    shops,
    transactions,
    suspiciousTransactions,
    grievances,
    demandInsights,
    products,
    slots,
    auditLogs,
    archives,
    fraudAnalysis,
    histories,
  } = await loadAdminData();

  sendResponse(res, 200, "Admin overview fetched successfully", {
    metrics: {
      totalUsers: users.length,
      totalBookings: bookings.length,
      totalShops: shops.length,
      totalProducts: products.length,
      suspiciousCases: Math.max(
        suspiciousTransactions.length,
        fraudAnalysis.suspiciousUsers.length
      ),
      openGrievances: grievances.filter((entry) => entry.status !== "resolved").length,
      blockedUsers: users.filter((entry) => entry.isBlocked).length,
    },
    users: users.map((user) => ({
      ...user.toObject(),
      entitlement: calculateEntitlement(user),
    })),
    bookings,
    shops,
    products,
    stockAlerts: buildStockAlerts(shops, products),
    suspiciousTransactions,
    fraudAlerts: fraudAnalysis.suspiciousUsers,
    dealerRiskAlerts: fraudAnalysis.suspiciousDealers,
    stockMismatchAlerts: fraudAnalysis.stockMismatchAlerts,
    fraudModelInfo: fraudAnalysis.modelInfo,
    explainableFraudPanel: fraudAnalysis.suspiciousUsers.slice(0, 10),
    topSuspiciousUsers: fraudAnalysis.suspiciousUsers.slice(0, 5),
    bookingHeatmap: buildBookingHeatmap(bookings),
    dailyUsage: buildUsageSeries(bookings, transactions),
    actionSeries: buildActionSeries(histories),
    purchaseTrends: buildItemDistribution(transactions),
    peakHours: buildPeakHours(histories),
    demandInsights,
    grievances: grievances.slice(0, 12),
    liveBookings: bookings.filter((booking) => booking.status === "booked").slice(0, 12),
    queueStatus: buildQueueStatus(slots).slice(0, 12),
    archives,
    auditLogs,
    historyPreview: histories.slice(0, 20),
  });
});

export const getAdminAnalytics = asyncHandler(async (_req, res) => {
  const { users, bookings, transactions, fraudAnalysis, histories } = await loadAdminData();

  sendResponse(res, 200, "Admin analytics fetched successfully", {
    totals: {
      totalUsers: users.length,
      totalBookings: bookings.length,
      totalPurchases: transactions.length,
      fraudCount: fraudAnalysis.suspiciousUsers.length,
    },
    graphData: {
      dailyActivity: buildActionSeries(histories),
      purchaseTrends: buildItemDistribution(transactions),
      fraudScores: fraudAnalysis.suspiciousUsers.slice(0, 10).map((entry) => ({
        name: entry.name,
        fraudScore: entry.fraudScore,
      })),
      peakHours: buildPeakHours(histories),
    },
    topSuspiciousUsers: fraudAnalysis.suspiciousUsers.slice(0, 5),
  });
});

export const getAdminHistory = asyncHandler(async (req, res) => {
  const filter = {};
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_HISTORY_LIMIT));
  const skip = (page - 1) * limit;

  if (req.query.action) {
    filter.actionType = req.query.action;
  }

  if (req.query.userId) {
    filter.user = req.query.userId;
  }

  if (req.query.date) {
    const start = new Date(req.query.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(req.query.date);
    end.setHours(23, 59, 59, 999);
    filter.timestamp = { $gte: start, $lte: end };
  }

  const [history, total] = await Promise.all([
    History.find(filter)
      .populate("user", "name rationCardNumber fraudScore flagged")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    History.countDocuments(filter),
  ]);

  sendResponse(res, 200, "History fetched successfully", {
    history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

export const getAdminReport = asyncHandler(async (req, res) => {
  const format = (req.query.format || "csv").toLowerCase();
  const type = (req.query.type || "history").toLowerCase();

  const [histories, transactions, fraudCases] = await Promise.all([
    History.find()
      .populate("user", "name rationCardNumber")
      .sort({ timestamp: -1 })
      .limit(500),
    Transaction.find()
      .populate("user", "name rationCardNumber")
      .populate("shop", "shopName")
      .sort({ transactionDate: -1 })
      .limit(500),
    Fraud.find()
      .populate("user", "name rationCardNumber")
      .populate("shop", "shopName dealerName")
      .sort({ score: -1 })
      .limit(200),
  ]);

  const historyRows = histories.map((entry) => ({
    timestamp: entry.timestamp.toISOString(),
    user: entry.user?.name || "Unknown",
    rationCardNumber: entry.user?.rationCardNumber || "-",
    actionType: entry.actionType,
    device: entry.device,
    ipAddress: entry.ipAddress,
    details: entry.details,
  }));

  const purchaseRows = transactions.map((entry) => ({
    timestamp: entry.transactionDate.toISOString(),
    user: entry.user?.name || "Unknown",
    rationCardNumber: entry.user?.rationCardNumber || "-",
    shop: entry.shop?.shopName || "-",
    items: (entry.items || [])
      .map((item) => `${item.item}:${item.quantity}`)
      .join("; "),
  }));

  const fraudRows = fraudCases.map((entry) => ({
    entityType: entry.entityType,
    user: entry.user?.name || "-",
    rationCardNumber: entry.user?.rationCardNumber || "-",
    shop: entry.shop?.shopName || "-",
    dealerName: entry.shop?.dealerName || "-",
    score: entry.score,
    reasons: entry.reasons.join("; "),
    status: entry.status,
  }));

  const rows =
    type === "purchase" ? purchaseRows : type === "fraud" ? fraudRows : historyRows;

  if (format === "pdf") {
    const pdfBuffer = await generatePdfReport({
      title: `Smart Queue Skip Portal ${type} report`,
      sections: [
        {
          heading: "Summary",
          lines: [
            `Generated at: ${new Date().toLocaleString()}`,
            `Rows: ${rows.length}`,
            `Report type: ${type}`,
          ],
        },
        {
          heading: "Entries",
          lines: rows.slice(0, 50).map((row) => JSON.stringify(row)),
        },
      ],
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report.pdf"`);
    res.send(pdfBuffer);
    return;
  }

  const csv = generateCsvReport({ rows });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report.csv"`);
  res.send(csv);
});

export const getProducts = asyncHandler(async (_req, res) => {
  const page = Math.max(1, Number(_req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(_req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const query = String(_req.query.search || "").trim();
  const type = String(_req.query.type || "").trim().toLowerCase();
  const filter = {};

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { sku: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
    ];
  }

  if (type) {
    filter.type = type;
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  sendResponse(res, 200, "Products fetched successfully", {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const normalizedType = (req.body.type || "paid").toLowerCase();
  const normalizedCategory = String(req.body.category || "").trim().toLowerCase();

  if (!normalizedCategory) {
    throw new ApiError(400, "Category is required");
  }

  const product = await Product.create({
    name: req.body.name,
    sku: req.body.sku,
    category: normalizedCategory,
    type: normalizedType,
    unit: req.body.unit,
    stockAvailable: req.body.stockAvailable,
    reorderLevel: req.body.reorderLevel,
    price: normalizedType === "free" ? 0 : req.body.price,
    notes: req.body.notes,
  });

  await createAuditLog({
    entityType: "product",
    entityId: product._id.toString(),
    action: "created",
    actorId: req.user._id,
    payload: {
      name: product.name,
      stockAvailable: product.stockAvailable,
    },
  });

  sendResponse(res, 201, "Product created successfully", { product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const previousStock = product.stockAvailable;
  Object.assign(product, req.body);
  if (req.body.category) {
    product.category = String(req.body.category).trim().toLowerCase();
  }
  if ((product.type || "").toLowerCase() === "free") {
    product.price = 0;
  }
  await product.save();

  await createAuditLog({
    entityType: "product",
    entityId: product._id.toString(),
    action: "updated",
    actorId: req.user._id,
    payload: {
      previousStock,
      currentStock: product.stockAvailable,
      changes: req.body,
    },
  });

  if (product.stockAvailable > product.reorderLevel) {
    const recipients = await User.find({ isBlocked: false }).select("rationCardNumber");
    sendStockAvailabilityNotification({ product, users: recipients });
  }

  sendResponse(res, 200, "Product updated successfully", { product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  await product.deleteOne();

  await createAuditLog({
    entityType: "product",
    entityId: req.params.productId,
    action: "deleted",
    actorId: req.user._id,
    payload: { name: product.name },
  });

  sendResponse(res, 200, "Product deleted successfully");
});

export const getManagedUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  sendResponse(res, 200, "Users fetched successfully", {
    users: users.map((user) => ({
      ...user.toObject(),
      entitlement: calculateEntitlement(user),
    })),
  });
});

export const toggleUserBlock = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isBlocked = !user.isBlocked;
  await user.save();

  await createAuditLog({
    entityType: "user",
    entityId: user._id.toString(),
    action: user.isBlocked ? "blocked" : "unblocked",
    actorId: req.user._id,
    payload: {
      rationCardNumber: user.rationCardNumber,
    },
  });

  sendResponse(res, 200, `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`, {
    user,
  });
});

export const verifyUserIdentity = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const verification = await verifyIdentityPayload({
    rationCardNumber: user.rationCardNumber,
    aadhaarNumber: user.aadhaarNumber,
    phone: user.phone,
  });

  user.isVerified = verification.verified;
  await user.save();

  await createAuditLog({
    entityType: "user",
    entityId: user._id.toString(),
    action: "verified",
    actorId: req.user._id,
    payload: verification,
  });

  sendResponse(res, 200, "User identity checked successfully", {
    user,
    verification,
  });
});

export const getManagedShops = asyncHandler(async (_req, res) => {
  const shops = await Shop.find().sort({ shopName: 1 });
  sendResponse(res, 200, "Shops fetched successfully", { shops });
});

export const createManagedShop = asyncHandler(async (req, res) => {
  const shop = await Shop.create({
    shopId: req.body.shopId,
    shopName: req.body.shopName,
    dealerName: req.body.dealerName,
    location: req.body.location,
    stock: req.body.stock,
    initialStock: req.body.initialStock || req.body.stock,
  });

  await createAuditLog({
    entityType: "shop",
    entityId: shop._id.toString(),
    action: "created",
    actorId: req.user._id,
    payload: {
      shopId: shop.shopId,
      dealerName: shop.dealerName,
    },
  });

  sendResponse(res, 201, "Shop created successfully", { shop });
});

export const updateManagedShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.shopId);

  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  Object.assign(shop, req.body);
  await shop.save();

  await createAuditLog({
    entityType: "shop",
    entityId: shop._id.toString(),
    action: "updated",
    actorId: req.user._id,
    payload: req.body,
  });

  sendResponse(res, 200, "Shop updated successfully", { shop });
});

export const getFraudCases = asyncHandler(async (_req, res) => {
  let fraudCases = await Fraud.find()
    .populate("user", "name rationCardNumber")
    .populate("shop", "shopId shopName dealerName")
    .sort({ score: -1, updatedAt: -1 });

  if (!fraudCases.length) {
    await loadAdminData();
    fraudCases = await Fraud.find()
      .populate("user", "name rationCardNumber")
      .populate("shop", "shopId shopName dealerName")
      .sort({ score: -1, updatedAt: -1 });
  }

  sendResponse(res, 200, "Fraud cases fetched successfully", { fraudCases });
});

export const getArchives = asyncHandler(async (_req, res) => {
  await createArchiveSnapshot();
  const archives = await ArchiveRecord.find().sort({ year: -1, month: -1 });
  sendResponse(res, 200, "Archive records fetched successfully", { archives });
});

export const getQueueMonitoring = asyncHandler(async (_req, res) => {
  const slots = await Slot.find().sort({ date: 1, slotTime: 1 });
  sendResponse(res, 200, "Queue status fetched successfully", {
    queueStatus: buildQueueStatus(slots),
  });
});

export const sendAdminNotification = asyncHandler(async (req, res) => {
  const recipients = await User.find({
    isBlocked: false,
    ...(req.body.rationCardNumber ? { rationCardNumber: req.body.rationCardNumber } : {}),
  }).select("rationCardNumber name");

  recipients.forEach((user) =>
    sendNotification({
      channel: req.body.channel || "console",
      title: req.body.title,
      message: req.body.message,
      user,
    })
  );

  await createAuditLog({
    entityType: "notification",
    entityId: `notification-${Date.now()}`,
    action: "sent",
    actorId: req.user._id,
    payload: {
      title: req.body.title,
      recipients: recipients.length,
    },
  });

  sendResponse(res, 200, "Notification sent successfully", {
    recipients: recipients.length,
  });
});

export const getAuditLogs = asyncHandler(async (_req, res) => {
  const auditLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  sendResponse(res, 200, "Audit logs fetched successfully", { auditLogs });
});
