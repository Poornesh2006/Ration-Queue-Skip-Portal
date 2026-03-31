import express from "express";
import {
  confirmBookingPayment,
  createManualBooking,
  createBooking,
  getMyBookings,
  getUserBookingHistory,
  markBookingDelivered,
  verifyBookingQr,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { validateObjectIdParam, validateRequiredFields } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(protect);
router
  .route("/")
  .post(validateRequiredFields(["shopId", "slotId", "date"]), createBooking)
  .get(getMyBookings);
router.get("/user", getUserBookingHistory);
router.post(
  "/manual",
  authorizeRoles("admin", "shop_owner"),
  validateRequiredFields(["rationCardNumber", "shopId", "slotId", "date"]),
  createManualBooking
);
router.post(
  "/verify-qr",
  authorizeRoles("admin", "shop_owner"),
  validateRequiredFields(["qrCodeToken"]),
  verifyBookingQr
);
router.post(
  "/:bookingId/payment",
  validateObjectIdParam("bookingId"),
  validateRequiredFields(["transactionId"]),
  confirmBookingPayment
);
router.patch(
  "/:bookingId/deliver",
  validateObjectIdParam("bookingId"),
  authorizeRoles("admin", "shop_owner"),
  markBookingDelivered
);

export default router;
