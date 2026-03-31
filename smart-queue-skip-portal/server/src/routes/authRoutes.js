import express from "express";
import {
  getProfile,
  loginUser,
  logoutUser,
  sendOtp,
  registerUser,
  verifyFace,
  verifyUser,
  verifyOtp,
} from "../controllers/authController.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequiredFields } from "../middleware/validateMiddleware.js";

const router = express.Router();

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "auth-attempt",
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyPrefix: "otp-send",
  keyGenerator: (req) =>
    `${req.body.aadhaar_number || req.body.aadhaarNumber || "anonymous"}:${req.ip}`,
  message: "Too many OTP requests. Please wait 10 minutes before requesting again.",
});

router.post(
  "/register",
  validateRequiredFields(["name", "rationCardNumber", "familyMembers", "phone"]),
  registerUser
);
router.post(
  "/login",
  authAttemptLimiter,
  validateRequiredFields(["rationCardNumber", "password"]),
  loginUser
);
router.post(
  "/verify-user",
  validateRequiredFields(["aadhaar_number", "phone_number"]),
  verifyUser
);
router.post(
  "/verify",
  validateRequiredFields(["aadhaar_number", "phone_number"]),
  verifyUser
);
router.post(
  "/send-otp",
  otpLimiter,
  validateRequiredFields(["aadhaar_number", "phone_number"]),
  sendOtp
);
router.post(
  "/verify-face",
  validateRequiredFields(["aadhaar_number", "image"]),
  verifyFace
);
router.post(
  "/verify-otp",
  authAttemptLimiter,
  validateRequiredFields(["aadhaar_number", "otp"]),
  verifyOtp
);
router.get("/me", protect, getProfile);
router.post("/logout", protect, logoutUser);

export default router;
