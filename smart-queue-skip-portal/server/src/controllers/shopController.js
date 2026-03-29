import { Shop } from "../models/Shop.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";

export const getShops = asyncHandler(async (_req, res) => {
  const shops = await Shop.find()
    .select("shopId shopName location stock")
    .sort({ shopName: 1 });

  sendResponse(res, 200, "Shops fetched successfully", { shops });
});
