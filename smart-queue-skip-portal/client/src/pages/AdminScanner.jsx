import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Button from "../components/Button";
import { bookingService } from "../services/bookingService";

const parseQrPayload = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return { token: value };
  }
};

const AdminScanner = () => {
  const [scanValue, setScanValue] = useState("");
  const [booking, setBooking] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const qrToken = useMemo(() => parseQrPayload(scanValue)?.token || scanValue, [scanValue]);

  const handleVerify = async () => {
    if (!qrToken) {
      setError("Scan or paste a QR payload first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await bookingService.verifyQr({ qrCodeToken: qrToken });
      setBooking(response.booking);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to verify QR.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!booking?._id) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await bookingService.markDelivered(booking._id);
      setBooking(response.booking);
      setMessage("Booking marked as delivered.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark booking as delivered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Admin Scanner">
      <section className="panel-card split-grid">
        <div className="nested-panel">
          <h2>Scan Booking QR</h2>
          <div className="scanner-frame scanner-placeholder">
            <p>Camera scanner is in manual demo mode.</p>
            <p>Scan the booking QR using any phone scanner and paste the token or JSON payload below.</p>
          </div>
          <label>
            QR Payload / Token
            <textarea
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              rows={5}
              placeholder='Paste {"token":"..."} or the raw QR token here'
            />
          </label>
          <Button variant="primary" type="button" onClick={handleVerify} disabled={loading}>
            {loading ? "Checking..." : "Verify Booking"}
          </Button>
        </div>

        <div className="nested-panel">
          <h2>Booking Details</h2>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text success-banner">{message}</p>}

          {!booking ? (
            <p>No booking scanned yet.</p>
          ) : (
            <>
              <p>User: {booking.user?.name}</p>
              <p>Ration Card: {booking.user?.rationCardNumber}</p>
              <p>Shop: {booking.shop?.shopName}</p>
              <p>Slot: {booking.slot?.slotTime}</p>
              <p>Status: {booking.status}</p>
              <p>Payment Status: {booking.paymentStatus}</p>
              <div className="list-grid compact-grid">
                {(booking.requestedItems || []).map((item) => (
                  <article key={item.item} className="list-card">
                    <h3>{item.item}</h3>
                    <p>Qty: {item.quantity}</p>
                  </article>
                ))}
              </div>
              <Button variant="ghost" type="button" onClick={handleDeliver} disabled={loading || booking.status === "completed"}>
                {booking.status === "completed" ? "Already Delivered" : "Mark as Delivered"}
              </Button>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminScanner;
