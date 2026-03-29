import QRCode from "qrcode";

const UPI_ID = process.env.UPI_ID || "rationshop@upi";
const UPI_NAME = process.env.UPI_NAME || "RationShop";

export const buildUpiLink = ({ amount, note }) => {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: note || "Smart Queue Skip Portal",
  });

  return `upi://pay?${params.toString()}`;
};

export const generateUpiQrCode = async ({ amount, note }) => {
  if (!amount || amount <= 0) {
    return null;
  }

  const upiLink = buildUpiLink({ amount, note });
  const qrCodeDataUrl = await QRCode.toDataURL(upiLink);

  return {
    upiLink,
    qrCodeDataUrl,
  };
};
