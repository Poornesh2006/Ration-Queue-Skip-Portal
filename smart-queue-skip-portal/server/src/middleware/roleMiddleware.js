import { ApiError } from "../utils/apiError.js";

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, "You are not allowed to perform this action"));
  }

  next();
};
