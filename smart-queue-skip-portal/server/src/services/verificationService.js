import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";

export const verifyIdentityPayload = async ({
  rationCardNumber,
  aadhaarNumber,
  phone,
}) => {
  if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
    throw new ApiError(400, "Aadhaar number must be a 12-digit value");
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    throw new ApiError(400, "Phone number must be a 10-digit value");
  }

  const duplicateUser = await User.findOne({
    $or: [
      { rationCardNumber },
      ...(aadhaarNumber ? [{ aadhaarNumber }] : []),
      ...(phone ? [{ phone }] : []),
    ],
  });

  if (duplicateUser) {
    throw new ApiError(409, "Identity already exists in the system");
  }

  return {
    verified: true,
    provider: "mock-government-registry",
    timestamp: new Date().toISOString(),
  };
};
