import { User } from "../models/User.js";
import { History } from "../models/History.js";
import { calculateEntitlement } from "../services/entitlementService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });

  sendResponse(res, 200, "Users fetched successfully", { users });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "User profile fetched successfully", {
    user: {
      ...req.user.toObject(),
      entitlement: calculateEntitlement(req.user),
    },
  });
});

export const getMyHistory = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    History.find({ user: req.user._id }).sort({ timestamp: -1 }).skip(skip).limit(limit),
    History.countDocuments({ user: req.user._id }),
  ]);

  sendResponse(res, 200, "User history fetched successfully", {
    history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
