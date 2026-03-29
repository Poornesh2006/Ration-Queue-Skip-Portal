import { History } from "../models/History.js";

const getIpAddress = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  "";

const getDeviceName = (req) =>
  req.body.device_name ||
  req.body.deviceName ||
  req.headers["user-agent"] ||
  "Unknown device";

export const createHistoryEntry = async ({
  userId,
  actionType,
  details = {},
  ipAddress = "",
  device = "",
  timestamp = new Date(),
}) =>
  History.create({
    user: userId,
    actionType,
    details,
    timestamp,
    ipAddress,
    device,
  });

export const trackRequestHistory = async ({ req, userId, actionType, details = {} }) =>
  createHistoryEntry({
    userId,
    actionType,
    details,
    ipAddress: getIpAddress(req),
    device: getDeviceName(req),
  });

export const getRequestContext = (req) => ({
  ipAddress: getIpAddress(req),
  device: getDeviceName(req),
});
