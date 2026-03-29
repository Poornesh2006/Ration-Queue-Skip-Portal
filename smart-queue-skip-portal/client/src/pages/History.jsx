import { useEffect, useState } from "react";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Skeleton from "../components/Skeleton";
import { bookingService } from "../services/bookingService";
import { userService } from "../services/userService";
import { orderStorage } from "../utils/orderStorage";

const History = () => {
  const [bookings, setBookings] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
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
          bookingService.getMyBookings({ page, limit: 10 }),
          userService.getMyHistory({ page, limit: 10 }),
        ]);
        setBookings(bookingData.bookings);
        setPurchaseHistory(orderStorage.getHistory());
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

          {!loading && purchaseHistory.length === 0 && bookings.length === 0 && activityHistory.length === 0 && (
            <EmptyState
              title="No data available"
              description="No bookings or purchase history are available yet."
              icon="history"
            />
          )}

          {purchaseHistory.map((entry, index) => (
            <article key={`${entry.purchasedAt}-${index}`} className="history-card animated-slide-up">
              <div className="history-card-header">
                <strong>Paid Order</strong>
                <span>{new Date(entry.purchasedAt).toLocaleString()}</span>
              </div>
              <p>Payment: {entry.paymentMethod}</p>
              <p>Payment Status: {entry.paymentStatus || "paid"}</p>
              <p>Transaction ID: {entry.transactionId || "-"}</p>
              <p>Total: Rs {Number(entry.totalAmount || entry.total || 0).toFixed(2)}</p>
              <p>Slot: {entry.slotTime}</p>
              <div className="history-items">
                {(entry.items || []).map((item) => (
                  <div key={`${item.item}-${item.quantity}`} className="history-line">
                    {item.image && <img src={item.image} alt={item.name} className="history-thumb" />}
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}

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
              <span className={`status-badge ${booking.status}`}>{booking.status}</span>
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
