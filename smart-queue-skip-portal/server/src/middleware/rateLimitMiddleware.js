import { ApiError } from "../utils/apiError.js";

const buckets = new Map();

const cleanupExpiredBuckets = (now) => {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const resolveIdentifier = (req) => {
  const forwarded = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "anonymous";
};

export const rateLimit = ({
  windowMs,
  max,
  keyPrefix = "global",
  keyGenerator = resolveIdentifier,
  message = "Too many requests. Please try again later.",
} = {}) => {
  if (!windowMs || !max) {
    throw new Error("rateLimit requires both windowMs and max");
  }

  return (req, _res, next) => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const identifier = keyGenerator(req);
    const key = `${keyPrefix}:${identifier}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (bucket.count >= max) {
      next(new ApiError(429, message));
      return;
    }

    bucket.count += 1;
    next();
  };
};
