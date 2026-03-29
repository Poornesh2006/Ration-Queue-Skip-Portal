import { Booking } from "../models/Booking.js";
import { Grievance } from "../models/Grievance.js";
import { Shop } from "../models/Shop.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";

export const createGrievance = asyncHandler(async (req, res) => {
  const { category, description, proofUrl, bookingId, shopId } = req.body;

  const grievance = await Grievance.create({
    user: req.user._id,
    booking: bookingId || null,
    shop: shopId || null,
    category,
    description,
    proofUrl,
  });

  sendResponse(res, 201, "Grievance submitted successfully", { grievance });
});

export const getGrievances = asyncHandler(async (req, res) => {
  const grievances = await Grievance.find()
    .populate("user", "name rationCardNumber")
    .populate("shop", "shopName shopId")
    .populate("booking", "status date")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "Grievances fetched successfully", { grievances });
});
