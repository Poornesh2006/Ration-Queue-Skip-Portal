import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { verifyFaceMatch } from "../services/faceVerification.js";
import { sendOtpSms } from "../services/smsService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { sendResponse } from "../utils/sendResponse.js";
import { calculateEntitlement } from "../services/entitlementService.js";
import { verifyIdentityPayload } from "../services/verificationService.js";
import { trackRequestHistory } from "../services/historyService.js";

const buildAuthUser = (user) => ({
  id: user._id,
  name: user.name,
  rationCardNumber: user.rationCardNumber,
  familyMembers: user.familyMembers,
  age: user.age,
  isDisabled: user.isDisabled,
  emergencyAccess: user.emergencyAccess,
  priorityCategory: user.priorityCategory,
  phone: user.phone,
  city: user.city,
  village: user.village,
  pincode: user.pincode,
  cardType: user.cardType,
  profileImage: user.profileImage,
  aadhaarNumber: user.aadhaarNumber,
  entitlement: calculateEntitlement(user),
  role: user.role,
  isBlocked: user.isBlocked,
  isVerified: user.isVerified,
  devices: user.devices || [],
});

const normalizeIdentifier = (identifier = "") => identifier.trim();
const createSystemPassword = () => crypto.randomBytes(12).toString("hex");
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const otpExpiryDate = () => new Date(Date.now() + 5 * 60 * 1000);

const findCitizenByIdentifier = (identifier) =>
  User.findOne({
    role: { $ne: "admin" },
    $or: [{ phone: identifier }, { aadhaarNumber: identifier }],
  }).select("+otpCode +otpExpiry +otpAttempts");

const validateAadhaar = (aadhaarNumber) => /^\d{12}$/.test(aadhaarNumber);
const validatePhone = (phone) => /^\d{10}$/.test(phone);
const maskPhone = (phone = "") => (phone.length === 10 ? `******${phone.slice(-4)}` : phone);
const validatePassword = (password = "") => typeof password === "string" && password.length >= 8;

const updateDeviceTracking = async (user, req) => {
  const deviceId = req.body.device_id || req.body.deviceId;
  const deviceName = req.body.device_name || req.body.deviceName || "Unknown device";

  if (!deviceId) {
    return { isNewDevice: false, trackedDevices: user.devices?.length || 0 };
  }

  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "";

  const existingDevice = user.devices.find((device) => device.deviceId === deviceId);

  if (existingDevice) {
    existingDevice.deviceName = deviceName;
    existingDevice.lastLogin = new Date();
    existingDevice.ipAddress = ipAddress;
    await user.save();
    return {
      isNewDevice: false,
      trackedDevices: user.devices.length,
      currentDevice: existingDevice,
    };
  }

  user.devices.push({
    deviceId,
    deviceName,
    lastLogin: new Date(),
    ipAddress,
  });
  await user.save();

  return {
    isNewDevice: true,
    trackedDevices: user.devices.length,
    currentDevice: user.devices[user.devices.length - 1],
  };
};

export const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    rationCardNumber,
    familyMembers,
    age,
    isDisabled,
    emergencyAccess,
    phone,
    city,
    village,
    pincode,
    cardType,
    profileImage,
    aadhaarNumber,
    password,
    role = "user",
  } = req.body;

  const existingUser = await User.findOne({
    $or: [
      { rationCardNumber },
      { phone },
      ...(aadhaarNumber ? [{ aadhaarNumber }] : []),
    ],
  });

  if (existingUser) {
    throw new ApiError(409, "User with this ration card, phone, or Aadhaar already exists");
  }

  if (!validatePhone(phone)) {
    throw new ApiError(400, "Phone number must be 10 digits");
  }

  if (aadhaarNumber && !validateAadhaar(aadhaarNumber)) {
    throw new ApiError(400, "Aadhaar number must be 12 digits");
  }

  if ((role === "admin" || role === "shop_owner") && password && !validatePassword(password)) {
    throw new ApiError(400, "Password must be at least 8 characters for privileged users");
  }

  const verification = await verifyIdentityPayload({
    rationCardNumber,
    aadhaarNumber,
    phone,
  });

  const user = await User.create({
    name,
    rationCardNumber,
    familyMembers,
    age,
    isDisabled,
    emergencyAccess,
    phone,
    city,
    village,
    pincode,
    cardType,
    profileImage,
    aadhaarNumber,
    password: role === "admin" ? password || "Admin@123" : password || createSystemPassword(),
    role,
    isVerified: verification.verified,
  });

  sendResponse(res, 201, "User registered successfully", {
    verification,
    token: generateToken(user._id, user.role),
    user: buildAuthUser(user),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const rationCardNumber = String(req.body.rationCardNumber || "").trim().toUpperCase();
  const { password } = req.body;

  const user = await User.findOne({ rationCardNumber }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid ration card number or password");
  }

  if (user.isBlocked && user.role !== "admin") {
    throw new ApiError(403, "Your account is blocked. Please contact the admin.");
  }

  user.lastLoginAt = new Date();
  const deviceStatus = await updateDeviceTracking(user, req);
  await trackRequestHistory({
    req,
    userId: user._id,
    actionType: "login",
    details: {
      method: "password",
      rationCardNumber: user.rationCardNumber,
      role: user.role,
      isNewDevice: deviceStatus.isNewDevice,
    },
  });

  sendResponse(res, 200, "Login successful", {
    token: generateToken(user._id, user.role),
    user: buildAuthUser(user),
    deviceStatus,
  });
});

export const verifyUser = asyncHandler(async (req, res) => {
  const aadhaarNumber = normalizeIdentifier(req.body.aadhaar_number || req.body.aadhaarNumber);
  const phoneNumber = normalizeIdentifier(req.body.phone_number || req.body.phoneNumber);

  if (!validateAadhaar(aadhaarNumber)) {
    throw new ApiError(400, "Aadhaar number must be 12 digits");
  }

  if (!validatePhone(phoneNumber)) {
    throw new ApiError(400, "Phone number must be 10 digits");
  }

  const user = await User.findOne({
    aadhaarNumber,
    phone: phoneNumber,
    role: { $ne: "admin" },
  }).select("name aadhaarNumber phone rationCardNumber role isBlocked");

  if (!user) {
    throw new ApiError(404, "Aadhaar number and phone number do not match any citizen");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account is blocked. Please contact the admin.");
  }

  sendResponse(res, 200, "Citizen verified successfully", {
    verified: true,
    user: {
      name: user.name,
      aadhaar_number: user.aadhaarNumber,
      phone_number: user.phone,
      masked_phone_number: maskPhone(user.phone),
      ration_card_number: user.rationCardNumber,
    },
  });
});

export const verifyFace = asyncHandler(async (req, res) => {
  const aadhaarNumber = normalizeIdentifier(req.body.aadhaar_number || req.body.aadhaarNumber);
  const image = req.body.image;

  if (!validateAadhaar(aadhaarNumber)) {
    throw new ApiError(400, "Aadhaar number must be 12 digits");
  }

  const user = await User.findOne({
    aadhaarNumber,
    role: { $ne: "admin" },
  }).select("faceImage profileImage");

  if (!user) {
    throw new ApiError(404, "Citizen not found for face verification");
  }

  const result = await verifyFaceMatch({
    uploadedImage: image,
    storedImage: user.faceImage || user.profileImage,
  });

  sendResponse(res, 200, "Face verification processed", result);
});

export const sendOtp = asyncHandler(async (req, res) => {
  const aadhaarNumber = normalizeIdentifier(req.body.aadhaar_number || req.body.aadhaarNumber);
  const phoneNumber = normalizeIdentifier(req.body.phone_number || req.body.phoneNumber);

  if (!validateAadhaar(aadhaarNumber)) {
    throw new ApiError(400, "Aadhaar number must be 12 digits");
  }

  if (!validatePhone(phoneNumber)) {
    throw new ApiError(400, "Phone number must be 10 digits");
  }

  const user = await User.findOne({
    aadhaarNumber,
    phone: phoneNumber,
    role: { $ne: "admin" },
  }).select("+otpCode +otpExpiry +otpAttempts");

  if (!user) {
    throw new ApiError(404, "Citizen not found with this Aadhaar number and phone number");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account is blocked. Please contact the admin.");
  }

  const otp = generateOtp();
  user.otpCode = await bcrypt.hash(otp, 10);
  user.otpExpiry = otpExpiryDate();
  user.otpAttempts = 0;
  await user.save();

  const smsResult = await sendOtpSms({
    phoneNumber: user.phone,
    otp,
  });

  sendResponse(res, 200, "OTP sent successfully", {
    aadhaar_number: aadhaarNumber,
    expiresInSeconds: 300,
    masked_phone_number: maskPhone(user.phone),
    sms: smsResult,
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const aadhaarNumber = normalizeIdentifier(req.body.aadhaar_number || req.body.aadhaarNumber);
  const otp = String(req.body.otp || "").trim();

  if (!validateAadhaar(aadhaarNumber)) {
    throw new ApiError(400, "Aadhaar number must be 12 digits");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, "OTP must be 6 digits");
  }

  const user = await User.findOne({
    aadhaarNumber,
    role: { $ne: "admin" },
  }).select("+otpCode +otpExpiry +otpAttempts");

  if (!user || !user.otpCode || !user.otpExpiry) {
    throw new ApiError(400, "No active OTP found. Please request a new OTP.");
  }

  if (user.otpAttempts >= 3) {
    user.otpCode = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await user.save();
    throw new ApiError(429, "Too many invalid OTP attempts. Please request a new OTP.");
  }

  if (user.otpExpiry.getTime() < Date.now()) {
    user.otpCode = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await user.save();
    throw new ApiError(400, "OTP has expired. Please request a new OTP.");
  }

  const isMatch = await bcrypt.compare(otp, user.otpCode);

  if (!isMatch) {
    user.otpAttempts += 1;
    await user.save();
    throw new ApiError(401, "Invalid OTP");
  }

  user.otpCode = null;
  user.otpExpiry = null;
  user.otpAttempts = 0;
  user.lastLoginAt = new Date();
  const deviceStatus = await updateDeviceTracking(user, req);
  await trackRequestHistory({
    req,
    userId: user._id,
    actionType: "login",
    details: {
      method: "otp",
      rationCardNumber: user.rationCardNumber,
      isNewDevice: deviceStatus.isNewDevice,
    },
  });

  sendResponse(res, 200, "OTP verified successfully", {
    token: generateToken(user._id, user.role),
    user: buildAuthUser(user),
    deviceStatus,
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Profile fetched successfully", { user: req.user });
});

export const logoutUser = asyncHandler(async (req, res) => {
  await trackRequestHistory({
    req,
    userId: req.user._id,
    actionType: "logout",
    details: {
      rationCardNumber: req.user.rationCardNumber,
      role: req.user.role,
    },
  });

  sendResponse(res, 200, "Logout recorded successfully");
});
