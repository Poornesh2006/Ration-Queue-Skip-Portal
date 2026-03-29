import { Booking } from "../models/Booking.js";
import { Slot } from "../models/Slot.js";

const getDayName = (date) =>
  new Date(date).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

const dateBounds = (dateInput) => {
  const date = new Date(dateInput);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const predictDemandForDate = async (dateInput) => {
  const targetDay = getDayName(dateInput);
  const slots = await Slot.find().sort({ slotTime: 1 });

  const predictions = await Promise.all(
    slots.map(async (slot) => {
      const historicalBookings = await Booking.find({ slot: slot._id, status: "booked" })
        .select("date")
        .lean();

      const sameDayCount = historicalBookings.filter(
        (booking) => getDayName(booking.date) === targetDay
      ).length;
      const totalCount = historicalBookings.length;
      const predictedDemand = Math.max(
        4,
        Math.min(
          slot.maxLimit + 6,
          Math.round(totalCount * 0.2 + sameDayCount * 0.8 + slot.bookedCount * 0.4)
        )
      );

      slot.predictedDemand = predictedDemand;
      slot.maxLimit = Math.max(20, predictedDemand);
      await slot.save();

      return {
        slotId: slot._id,
        slotTime: slot.slotTime,
        predictedDemand,
        adjustedCapacity: slot.maxLimit,
      };
    })
  );

  return predictions;
};

export const getDemandInsights = async (dateInput) => {
  const { start, end } = dateBounds(dateInput);
  const slots = await Slot.find({
    $or: [{ slotDate: null }, { slotDate: { $gte: start, $lte: end } }],
  })
    .sort({ slotTime: 1 })
    .lean();

  return slots.map((slot) => ({
    slotId: slot._id,
    slotTime: slot.slotTime,
    predictedDemand: slot.predictedDemand || slot.bookedCount || 0,
    capacity: slot.maxLimit,
  }));
};
