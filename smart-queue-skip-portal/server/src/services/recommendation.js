import { Booking } from "../models/Booking.js";
import { Shop } from "../models/Shop.js";
import { getPriorityCategory } from "./slotEngine.js";

export const recommendBestShopAndSlot = async ({ user, slots }) => {
  const shops = await Shop.find().lean();
  const pastBookings = await Booking.find({ user: user._id })
    .populate("shop", "location")
    .populate("slot", "slotTime")
    .lean();

  const preferredLocations = new Set(
    pastBookings.map((booking) => booking.shop?.location).filter(Boolean)
  );
  const priorityCategory = getPriorityCategory(user);

  const rankedShops = shops
    .map((shop) => {
      const proximityBoost =
        shop.location === user.city || preferredLocations.has(shop.location) ? 0.35 : 0;
      const stockScore =
        ((shop.stock?.rice || 0) + (shop.stock?.wheat || 0) + (shop.stock?.sugar || 0)) / 1000;

      return {
        ...shop,
        recommendationScore: proximityBoost + stockScore,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

  const recommendedShop = rankedShops[0] || null;
  const recommendedSlot = [...slots]
    .filter((slot) => !slot.priorityOnly || slot.priorityCategory === priorityCategory)
    .sort((a, b) => (b.remaining || 0) - (a.remaining || 0))[0];

  return {
    recommendedShop: recommendedShop
      ? {
          shopId: recommendedShop._id,
          shopName: recommendedShop.shopName,
          location: recommendedShop.location,
          reason:
            recommendedShop.location === user.city
              ? "Closest available shop to your registered city"
              : "Best stock availability among nearby shops",
        }
      : null,
    recommendedSlot: recommendedSlot
      ? {
          slotId: recommendedSlot._id,
          slotTime: recommendedSlot.slotTime,
          reason: "Least crowded and priority-compatible slot",
        }
      : null,
  };
};
