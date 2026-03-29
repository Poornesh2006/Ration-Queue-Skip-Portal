import { Booking } from "../models/Booking.js";
import { Slot } from "../models/Slot.js";

const SLOT_DURATION_MINUTES = 30;

const parseEndMinutes = (slotTime) => {
  const [, endLabel] = slotTime.split(" - ");
  const [time, meridian] = endLabel.split(" ");
  const [hoursRaw, minutesRaw] = time.split(":").map(Number);
  let hours = hoursRaw;

  if (meridian === "PM" && hours !== 12) {
    hours += 12;
  }

  if (meridian === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutesRaw;
};

const formatMinutes = (minutes) => {
  const normalized = minutes % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const meridian = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${meridian}`;
};

const getDateBounds = (dateInput) => {
  const date = new Date(dateInput);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const ensureDynamicSlotsForDate = async (dateInput) => {
  const { start, end } = getDateBounds(dateInput);

  const [slots, bookingCount] = await Promise.all([
    Slot.find({
      $or: [{ slotDate: null }, { slotDate: { $gte: start, $lte: end } }],
    }).sort({ slotTime: 1 }),
    Booking.countDocuments({
      date: { $gte: start, $lte: end },
      status: "booked",
    }),
  ]);

  const dateSpecificDynamicSlots = slots.filter(
    (slot) => slot.isDynamic && slot.slotDate && slot.slotDate >= start && slot.slotDate <= end
  );

  if (slots.length === 0) {
    return [];
  }

  const capacity = slots.reduce((total, slot) => total + slot.maxLimit, 0);
  const utilization = capacity > 0 ? bookingCount / capacity : 0;

  if (utilization < 0.7 || dateSpecificDynamicSlots.length > 0) {
    return slots;
  }

  const lastSlot = slots[slots.length - 1];
  const endMinutes = parseEndMinutes(lastSlot.slotTime);
  const newStart = endMinutes;
  const newEnd = newStart + SLOT_DURATION_MINUTES;

  const dynamicSlot = await Slot.create({
    slotTime: `${formatMinutes(newStart)} - ${formatMinutes(newEnd)}`,
    slotDate: start,
    maxLimit: Math.max(10, Math.round(lastSlot.maxLimit * 0.75)),
    bookedCount: 0,
    isDynamic: true,
  });

  return [...slots, dynamicSlot];
};

export const getPriorityCategory = (user) => {
  if (user?.emergencyAccess) {
    return "emergency";
  }

  if (user?.isDisabled) {
    return "disabled";
  }

  if ((user?.age || 0) >= 60) {
    return "elderly";
  }

  return "standard";
};

export const recommendSlot = ({ slots, bookings, user }) => {
  if (!slots.length) {
    return null;
  }

  const userBookingHours = bookings
    .filter((booking) => booking.user.toString() === user._id.toString())
    .map((booking) => booking.slot?.slotTime || booking.slotTime)
    .filter(Boolean);

  const priorityCategory = getPriorityCategory(user);
  const ranked = slots
    .map((slot) => {
      const remaining = slot.remaining ?? Math.max(0, slot.maxLimit - slot.bookedCount);
      const crowdScore = remaining / slot.maxLimit;
      const familiarityBoost = userBookingHours.includes(slot.slotTime) ? 0.2 : 0;
      const priorityBoost =
        slot.priorityOnly && slot.priorityCategory === priorityCategory ? 0.25 : 0;

      return {
        ...slot,
        recommendationScore: crowdScore + familiarityBoost + priorityBoost,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

  return ranked[0];
};
