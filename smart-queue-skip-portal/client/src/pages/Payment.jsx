import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { bookingService } from "../services/bookingService";
import { orderStorage } from "../utils/orderStorage";
import { generateReceiptPdf } from "../utils/receiptGenerator";

const paymentImages = {
  gpay: "/images/payments/gpay.png",
  phonepe: "/images/payments/phonepe.png",
  paytm: "/images/payments/paytm.png",
  upi: "/images/payments/upi.png",
};

const Payment = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(() => orderStorage.getOrder());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!order) {
      setError("No pending order found.");
      return;
    }

    if (order.paymentRequired && !paymentMethod) {
      setError("Select a payment method first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      let paymentStatus = order.paymentStatus || "waived";
      let transactionId = order.transactionId || "";

      if (order.paymentRequired && order.bookingId) {
        transactionId = `TXN-${Date.now()}`;
        const response = await bookingService.confirmPayment(order.bookingId, {
          transactionId,
        });
        paymentStatus = response.paymentStatus;
      }

      const finalOrder = {
        ...order,
        paymentMethod: order.paymentRequired ? paymentMethod : "waived",
        paymentStatus,
        transactionId,
        purchasedAt: new Date().toISOString(),
        items: [...(order.freeItems || []), ...(order.paidItems || [])],
      };

      orderStorage.addHistory(finalOrder);
      orderStorage.setOrder(finalOrder);
      setOrder(finalOrder);
      setMessage(
        order.paymentRequired
          ? "Payment confirmed. Receipt is ready to download."
          : "Only free items selected. Payment skipped."
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to confirm payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!order) {
      return;
    }

    generateReceiptPdf({
      ...order,
      items: [...(order.freeItems || []), ...(order.paidItems || [])],
    });
  };

  return (
    <Layout title="Payment">
      <section className="panel-card payment-panel">
        <img
          src="/images/misc/TamilNadu_Logo.svg.png"
          alt="Tamil Nadu logo"
          className="portal-logo small"
        />
        <h2>Payment Summary</h2>

        {!order ? (
          <div className="empty-state">
            <p>No pending order found. Choose products and a slot first.</p>
            <Link className="primary-button" to="/slots">
              Go to Booking
            </Link>
          </div>
        ) : (
          <>
            <div className="payment-summary">
              <p>Free Items: {(order.freeItems || []).length}</p>
              <p>Paid Items: {(order.paidItems || []).length}</p>
              <p>
                <strong>Total Amount: Rs {Number(order.totalAmount || 0).toFixed(2)}</strong>
              </p>
              <p>Payment Status: {order.paymentStatus || "pending"}</p>
              <p>Slot: {order.slotTime || "Booked slot"}</p>
            </div>

            <div className="list-grid compact-grid">
              {(order.freeItems || []).map((item) => (
                <article key={`free-${item.item}`} className="list-card">
                  <h3>{item.name}</h3>
                  <p>Free item</p>
                  <p>
                    {item.quantity} {item.unit}
                  </p>
                </article>
              ))}

              {(order.paidItems || []).map((item) => (
                <article key={`paid-${item.item}`} className="list-card warning-card">
                  <h3>{item.name}</h3>
                  <p>Paid item</p>
                  <p>
                    {item.quantity} {item.unit}
                  </p>
                  <p>Rs {Number(item.amount || 0).toFixed(2)}</p>
                </article>
              ))}
            </div>

            {order.paymentRequired ? (
              <>
                <label>
                  Payment Method
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option value="">Select payment method</option>
                    <option value="gpay">Google Pay</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="paytm">Paytm</option>
                    <option value="upi">UPI</option>
                  </select>
                </label>

                <div className="qr-card payment-qr-card">
                  <h3>UPI Payment</h3>
                  {order.upiQrCodeDataUrl && (
                    <img src={order.upiQrCodeDataUrl} alt="UPI payment QR" width="180" height="180" />
                  )}
                  <p>{order.upiLink}</p>
                  {paymentMethod && (
                    <div className="payment-visual">
                      <img src={paymentImages[paymentMethod]} alt={paymentMethod} />
                    </div>
                  )}
                  <a className="ui-button ui-button-ghost" href={order.upiLink} target="_blank" rel="noreferrer">
                    <span>Pay Now</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="recommendation-card">
                <h3>No payment required</h3>
                <p>All selected ration items are free or subsidised in this order.</p>
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
            {message && <p className="success-text success-banner">{message}</p>}

            <div className="inline-actions">
              <Link className="ghost-button" to="/slots">
                Back
              </Link>
              <button className="primary-button" type="button" onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Confirming..." : order.paymentRequired ? "Confirm Payment" : "Complete Order"}
              </button>
              <button className="ghost-button" type="button" onClick={handleDownloadReceipt}>
                Download Receipt
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => navigate("/history")}
              >
                View History
              </button>
            </div>
          </>
        )}
      </section>
    </Layout>
  );
};

export default Payment;
