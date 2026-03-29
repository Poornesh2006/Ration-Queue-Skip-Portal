import { ApiError } from "../utils/apiError.js";

export const validateRequiredFields = (fields) => (req, _res, next) => {
  const missingFields = fields.filter((field) => {
    const value = req.body[field];
    return value === undefined || value === null || value === "";
  });

  if (missingFields.length > 0) {
    return next(
      new ApiError(400, `Missing required field(s): ${missingFields.join(", ")}`)
    );
  }

  next();
};

export const validateObjectIdParam = (paramName) => (req, _res, next) => {
  const value = req.params[paramName];

  if (!/^[a-f\d]{24}$/i.test(String(value || ""))) {
    return next(new ApiError(400, `Invalid ${paramName}`));
  }

  next();
};
