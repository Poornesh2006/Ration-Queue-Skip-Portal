import { Slot } from "../models/Slot.js";
import { Booking } from "../models/Booking.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { predictDemandForDate } from "../services/demandPrediction.js";
import { recommendBestShopAndSlot } from "../services/recommendation.js";
import {
  ensureDynamicSlotsForDate,
  ensureTrialSlotsForDate,
  getPriorityCategory,
  recommendSlot,
} from "../services/slotEngine.js";

const getDateKey = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const dateParam = req.query.date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const queryDate = dateParam ? new Date(dateParam) : new Date(today);
  const dayStart = new Date(queryDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(queryDate);
  dayEnd.setHours(23, 59, 59, 999);

  await predictDemandForDate(queryDate);
  await ensureDynamicSlotsForDate(queryDate);
  await ensureTrialSlotsForDate(queryDate);

  const slotQuery = dateParam
    ? {
        $or: [{ slotDate: null }, { slotDate: { $gte: dayStart, $lte: dayEnd } }],
      }
    : {
        slotDate: { $gte: today },
      };

  const slots = await Slot.find(slotQuery)
    .sort({ slotTime: 1 })
    .lean();
  const bookings = await Booking.find({
    date: dateParam ? { $gte: dayStart, $lte: dayEnd } : { $gte: today },
    status: "booked",
  }).lean();
  const pastBookings = await Booking.find({
    user: req.user._id,
  })
    .populate("slot", "slotTime")
    .lean();

  const priorityCategory = getPriorityCategory(req.user);
  const todayKey = getDateKey(today);
  const selectedDateKey = getDateKey(queryDate);

  const slotBookings = bookings.reduce((acc, booking) => {
    const key = booking.slot.toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const payload = slots
    .map((slot) => {
      const bookedCount = Math.max(slot.bookedCount || 0, slotBookings[slot._id.toString()] || 0);
      const remaining = slot.maxLimit - bookedCount;
      const dateKey = getDateKey(slot.slotDate || queryDate);

      return {
        ...slot,
        bookedCount,
        remaining,
        effectiveDate: dateKey ? `${dateKey}T00:00:00` : null,
        dateKey,
        priorityEligible:
          !slot.priorityOnly ||
          slot.priorityCategory === priorityCategory ||
          priorityCategory === "emergency",
      };
    })
    .filter((slot) => slot.remaining > 0 && slot.dateKey && slot.dateKey >= todayKey);

  const visibleSlots = dateParam
    ? payload.filter((slot) => slot.dateKey === selectedDateKey)
    : payload;

  const availableDates = Object.values(
    payload.reduce((accumulator, slot) => {
      const isoDate = slot.dateKey;
      if (!isoDate) {
        return accumulator;
      }

      if (!accumulator[isoDate]) {
        accumulator[isoDate] = {
          date: isoDate,
          availableSlotsCount: 0,
          badge: "Available",
        };
      }
      accumulator[isoDate].availableSlotsCount += 1;
      return accumulator;
    }, {})
  ).sort((left, right) => left.date.localeCompare(right.date));

  const recommendedSlot = recommendSlot({
    slots: visibleSlots.filter((slot) => slot.priorityEligible),
    bookings: pastBookings,
    user: req.user,
  });
  const shopRecommendation = await recommendBestShopAndSlot({
    user: req.user,
    slots: visibleSlots,
  });

  sendResponse(res, 200, "Slots fetched successfully", {
    slots: visibleSlots,
    availableDates,
    demandInsights: visibleSlots.map((slot) => ({
      slotId: slot._id,
      slotTime: slot.slotTime,
      predictedDemand: slot.predictedDemand || 0,
      currentCapacity: slot.maxLimit,
    })),
    recommendation: recommendedSlot
      ? {
          slotId: recommendedSlot._id,
          slotTime: recommendedSlot.slotTime,
          reason:
            recommendedSlot.priorityOnly && recommendedSlot.priorityCategory === priorityCategory
              ? "Reserved priority-friendly slot with lower crowd level"
              : "Best match based on your booking history and current demand",
        }
      : null,
    shopRecommendation: shopRecommendation.recommendedShop,
  });
});
