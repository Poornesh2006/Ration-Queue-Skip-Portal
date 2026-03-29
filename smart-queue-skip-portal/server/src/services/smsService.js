import { ApiError } from "../utils/apiError.js";

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

export const sendOtpSms = async ({ phoneNumber, otp }) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const demoMode = process.env.SHOW_DEMO_OTP === "true";

  if (!apiKey) {
    return {
      delivered: false,
      provider: "demo-fallback",
      message: "FAST2SMS_API_KEY missing. Demo OTP mode is enabled.",
      demoOtp: demoMode ? otp : undefined,
    };
  }

  try {
    const payload = new URLSearchParams({
      variables_values: otp,
      route: "otp",
      numbers: phoneNumber,
    });

    const response = await fetch(FAST2SMS_URL, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });
    const data = await response.json();

    if (!response.ok || !data?.return) {
      throw new ApiError(502, data?.message?.[0] || "Fast2SMS rejected the OTP request");
    }

    return {
      delivered: true,
      provider: "fast2sms",
      requestId: data.request_id,
      message: data.message?.[0] || "Message sent successfully",
      demoOtp: demoMode ? otp : undefined,
    };
  } catch (error) {
    console.error("Fast2SMS OTP error", error.message);
    throw new ApiError(502, "Unable to send OTP via SMS right now");
  }
};
