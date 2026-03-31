import { useEffect, useState } from "react";
import { generateReceiptPdf } from "../utils/receiptGenerator";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Skeleton from "../components/Skeleton";
import { bookingService } from "../services/bookingService";
import { userService } from "../services/userService";

const History = () => {
  const [bookings, setBookings] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const [bookingData, historyData] = await Promise.all([
          bookingService.getUserBookingHistory(),
          userService.getHistory({ page, limit: 10 }),
        ]);
        setBookings(bookingData.bookings);
        setActivityHistory(historyData.history);
        setPagination(historyData.pagination);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to fetch history");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [page]);

  return (
    <Layout title="History">
      <Card className="history-shell">
        <img
          src="/images/misc/TamilNadu_Logo.svg.png"
          alt="Tamil Nadu logo"
          className="portal-logo small"
        />
        <h2>Purchase History</h2>

        {error && <p className="error-text">{error}</p>}

        <div className="history-stack">
          {loading && Array.from({ length: 3 }, (_, index) => (
            <article key={`history-skeleton-${index}`} className="history-card">
              <div className="history-card-header">
                <Skeleton className="skeleton-line skeleton-line-short" />
                <Skeleton className="skeleton-line skeleton-line-short" />
              </div>
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line" />
              <Skeleton className="skeleton-line skeleton-line-wide" />
            </article>
          ))}

          {!loading && bookings.length === 0 && activityHistory.length === 0 && (
            <EmptyState
              title="No data available"
              description="No bookings or purchase history are available yet."
              icon="history"
            />
          )}

          {bookings.map((booking) => (
            <article key={booking._id} className="history-card animated-slide-up">
              <div className="history-card-header">
                <strong>Slot Booking</strong>
                <span>{new Date(booking.date).toLocaleDateString()}</span>
              </div>
              <p>{booking.shop.shopName}</p>
              <p>{booking.shop.location}</p>
              <p>{booking.slot.slotTime}</p>
              <p>Source: {booking.bookingSource}</p>
              <p>Payment Status: {booking.paymentStatus}</p>
              <p>Total: Rs {Number(booking.totalAmount || 0).toFixed(2)}</p>
              <span className={`status-badge ${booking.status}`}>{booking.status}</span>
              {!!booking.requestedItems?.length && (
                <div className="history-items">
                  {booking.requestedItems.map((item) => (
                    <div key={`${booking._id}-${item.item}`} className="history-line">
                      <span>
                        {item.item} x {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {booking.qrCodeDataUrl && (
                <div className="qr-card">
                  <img src={booking.qrCodeDataUrl} alt="Booking QR code" width="160" height="160" />
                </div>
              )}
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    generateReceiptPdf({
                      receiptNumber: booking.receiptNumber,
                      userName: booking.user?.name,
                      rationCardNumber: booking.user?.rationCardNumber,
                      slotTime: booking.slot?.slotTime,
                      date: new Date(booking.date).toLocaleDateString(),
                      items: (booking.requestedItems || []).map((item) => ({
                        name: item.item,
                        quantity: item.quantity,
                        unit: "",
                        amount: 0,
                      })),
                      totalAmount: booking.totalAmount,
                      paymentStatus: booking.paymentStatus,
                      transactionId: booking.transactionId,
                      qrCodeDataUrl: booking.qrCodeDataUrl,
                    })
                  }
                >
                  Download Receipt
                </button>
              </div>
            </article>
          ))}

          {activityHistory.map((entry) => (
            <article key={entry._id} className="history-card animated-slide-up">
              <div className="history-card-header">
                <strong>{entry.actionType.toUpperCase()}</strong>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p>Device: {entry.device || "Unknown device"}</p>
              <p>IP: {entry.ipAddress || "-"}</p>
              {entry.details?.rationCardNumber && <p>Card: {entry.details.rationCardNumber}</p>}
              {entry.details?.shopName && <p>Shop: {entry.details.shopName}</p>}
              {entry.details?.slotTime && <p>Slot: {entry.details.slotTime}</p>}
              {entry.details?.transactionId && <p>Transaction ID: {entry.details.transactionId}</p>}
            </article>
          ))}
        </div>
        {pagination && (
          <div className="inline-actions">
            <button className="ghost-button" type="button" disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              className="ghost-button"
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default History;
