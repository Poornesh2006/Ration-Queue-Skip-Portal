import { Fraud } from "../models/Fraud.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";

export const getFraudInsights = asyncHandler(async (_req, res) => {
  const fraudCases = await Fraud.find()
    .populate("user", "name rationCardNumber")
    .populate("shop", "shopId shopName dealerName")
    .sort({ score: -1, updatedAt: -1 });

  const suspiciousUsers = fraudCases
    .filter((entry) => entry.entityType === "user" && entry.user)
    .map((entry) => ({
      userId: entry.user._id,
      name: entry.user.name,
      rationCardNumber: entry.user.rationCardNumber,
      fraudScore: entry.score,
      reasons: entry.reasons,
      explainability: entry.explainability,
      status: entry.status,
    }));

  const suspiciousDealers = fraudCases
    .filter((entry) => entry.entityType === "shop" && entry.shop)
    .map((entry) => ({
      shopId: entry.shop._id,
      shopName: entry.shop.shopName,
      dealerName: entry.shop.dealerName,
      dealerFraudScore: entry.score,
      reasons: entry.reasons,
      status: entry.status,
    }));

  sendResponse(res, 200, "Fraud insights fetched successfully", {
    suspiciousUsers,
    suspiciousDealers,
    fraudCases,
  });
});
