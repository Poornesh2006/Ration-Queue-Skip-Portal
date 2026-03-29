import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import Button from "../components/Button";
import { adminService } from "../services/adminService";
import { bookingService } from "../services/bookingService";
import { shopService } from "../services/shopService";
import { slotService } from "../services/slotService";

const defaultDate = new Date().toISOString().slice(0, 10);

const AdminPage = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shops, setShops] = useState([]);
  const [slots, setSlots] = useState([]);
  const [manualBooking, setManualBooking] = useState({
    rationCardNumber: "",
    shopId: "",
    slotId: "",
    date: defaultDate,
  });
  const [shopForm, setShopForm] = useState({
    shopId: "",
    shopName: "",
    dealerName: "",
    location: "",
    stock: { rice: 0, wheat: 0, sugar: 0, kerosene: 0 },
  });
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    rationCardNumber: "",
  });
  const [manualMessage, setManualMessage] = useState("");
  const [fraudSearch, setFraudSearch] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    userId: "",
    action: "",
    date: "",
  });

  useEffect(() => {
    const loadOverview = async (selectedDate = defaultDate) => {
      try {
        const [overviewResponse, analyticsResponse, historyResponse, shopsResponse, slotsResponse] = await Promise.all([
          adminService.getOverview(),
          adminService.getAnalytics(),
          adminService.getHistory(),
          shopService.getShops(),
          slotService.getSlots(selectedDate),
        ]);
        setOverview(overviewResponse);
        setAnalytics(analyticsResponse);
        setHistoryEntries(historyResponse.history);
        setShops(shopsResponse.shops);
        setSlots(slotsResponse.slots);
      } catch (requestError) {
        setError(requestError.response?.data?.message || t("failed_fetch_admin"));
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, []);

  const handleChange = (event) => {
    setManualBooking((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleHistoryFilterChange = (event) => {
    setHistoryFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleHistorySearch = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const data = await adminService.getHistory(historyFilters);
      setHistoryEntries(data.history);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load activity history.");
    }
  };

  const handleDownloadReport = async (type, format) => {
    try {
      const { blob } = await adminService.downloadReport({ type, format });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to download report.");
    }
  };

  const handleShopFieldChange = (event) => {
    const { name, value } = event.target;

    if (name.startsWith("stock.")) {
      const item = name.split(".")[1];
      setShopForm((current) => ({
        ...current,
        stock: {
          ...current.stock,
          [item]: Number(value),
        },
      }));
      return;
    }

    setShopForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleNotificationChange = (event) => {
    setNotificationForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleManualBooking = async (event) => {
    event.preventDefault();
    setManualMessage("");
    setError("");

    try {
      const data = await bookingService.createManualBooking(manualBooking);
      setManualMessage(data.notification);
      const refreshed = await adminService.getOverview();
      setOverview(refreshed);
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("manual_booking_failed"));
    }
  };

  const handleCreateShop = async (event) => {
    event.preventDefault();
    setError("");
    setManualMessage("");

    try {
      await adminService.createShop({
        ...shopForm,
        initialStock: shopForm.stock,
      });
      setShopForm({
        shopId: "",
        shopName: "",
        dealerName: "",
        location: "",
        stock: { rice: 0, wheat: 0, sugar: 0, kerosene: 0 },
      });
      setManualMessage("Shop created successfully.");
      const refreshed = await adminService.getOverview();
      setOverview(refreshed);
      const shopsResponse = await shopService.getShops();
      setShops(shopsResponse.shops);
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("shop_creation_failed"));
    }
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();
    setError("");
    setManualMessage("");

    try {
      const data = await adminService.sendNotification(notificationForm);
      setManualMessage(`Notification sent to ${data.recipients} user(s).`);
      setNotificationForm({
        title: "",
        message: "",
        rationCardNumber: "",
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("notification_failed"));
    }
  };

  return (
    <Layout title={t("admin_panel")}>
      {loading && <LoadingSpinner label={t("loading_admin_analytics")} />}
      {error && <p className="error-text">{error}</p>}

      {overview && (
        <>
          <section className="stats-grid admin-stats-grid">
            <article className="metric-card animated-slide-up">
              <strong>{overview.metrics.totalUsers}</strong>
              <span>{t("total_users")}</span>
            </article>
            <article className="metric-card animated-slide-up">
              <strong>{overview.metrics.totalBookings}</strong>
              <span>{t("total_bookings")}</span>
            </article>
            <article className="metric-card animated-slide-up">
              <strong>{overview.metrics.totalShops}</strong>
              <span>{t("shops_monitored")}</span>
            </article>
            <article className="metric-card animated-slide-up">
              <strong>{overview.metrics.totalProducts}</strong>
              <span>{t("products_managed")}</span>
            </article>
            <article className="metric-card animated-slide-up danger-metric">
              <strong>{overview.metrics.suspiciousCases}</strong>
              <span>{t("suspicious_cases")}</span>
            </article>
            <article className="metric-card animated-slide-up">
              <strong>{overview.metrics.openGrievances}</strong>
              <span>{t("open_grievances")}</span>
            </article>
            <article className="metric-card animated-slide-up">
              <strong>{overview.metrics.blockedUsers}</strong>
              <span>{t("blocked_users")}</span>
            </article>
          </section>

          {analytics && (
            <>
              <section className="panel-card">
                <h2>Daily Activity Analytics</h2>
                <div className="chart-card">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={analytics.graphData.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="login" stroke="#2563eb" strokeWidth={3} />
                      <Line type="monotone" dataKey="booking" stroke="#16a34a" strokeWidth={3} />
                      <Line type="monotone" dataKey="purchase" stroke="#f59e0b" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="panel-card split-grid">
                <div className="chart-card">
                  <h2>Purchase Trends</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analytics.graphData.purchaseTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="item" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#16a34a" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h2>Peak Activity Hours</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={analytics.graphData.peakHours}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="activityCount" stroke="#ef4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="panel-card split-grid">
                <div className="chart-card">
                  <h2>Top Fraud Scores</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analytics.graphData.fraudScores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="fraudScore" fill="#dc2626" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h2>Purchase Distribution</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={analytics.graphData.purchaseTrends}
                        dataKey="quantity"
                        nameKey="item"
                        outerRadius={95}
                      >
                        {analytics.graphData.purchaseTrends.map((entry, index) => (
                          <Cell
                            key={entry.item}
                            fill={["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#7c3aed"][index % 5]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}

          <section className="panel-card">
            <h2>{t("live_bookings")}</h2>
            <div className="list-grid compact-grid">
              {overview.liveBookings.map((booking) => (
                <article key={booking._id} className="list-card">
                  <h3>{booking.user.name}</h3>
                  <p>{booking.shop.shopName}</p>
                  <p>{booking.slot.slotTime}</p>
                  <p>{new Date(booking.date).toLocaleDateString()}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("shop_stock_levels")}</h2>
            <div className="list-grid">
              {overview.shops.map((shop) => (
                <article key={shop._id} className="list-card">
                  <h3>{shop.shopName}</h3>
                  <p>{shop.location}</p>
                  <p>Rice: {shop.stock.rice}</p>
                  <p>Wheat: {shop.stock.wheat}</p>
                  <p>Sugar: {shop.stock.sugar}</p>
                  <p>Kerosene: {shop.stock.kerosene}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("stock_alerts")}</h2>
            <div className="list-grid">
              {overview.stockAlerts.length ? (
                overview.stockAlerts.map((alert) => (
                  <article
                    key={alert.shopId ? `${alert.shopId}-${alert.item}` : `${alert.productId}-${alert.item}`}
                    className="list-card warning-card"
                  >
                    <h3>{alert.shopName || alert.productName}</h3>
                    <p>{alert.item.toUpperCase()}</p>
                    <p>
                      {alert.current} / {alert.initial} remaining
                    </p>
                    <p>{alert.reason}</p>
                  </article>
                ))
              ) : (
                <p>{t("no_stock_alerts")}</p>
              )}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("stock_mismatch_alerts")}</h2>
            <div className="list-grid">
              {overview.stockMismatchAlerts.length ? (
                overview.stockMismatchAlerts.map((alert) => (
                  <article key={alert.shopId} className="list-card warning-card">
                    <h3>{alert.shopName}</h3>
                    {alert.mismatches.map((mismatch) => (
                      <p key={mismatch.item}>
                        {mismatch.item}: expected {mismatch.expected}, actual {mismatch.actual}
                      </p>
                    ))}
                  </article>
                ))
              ) : (
                <p>{t("no_stock_mismatch_alerts")}</p>
              )}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("fraud_alerts")}</h2>
            <div className="toolbar-row">
              <label className="ui-input-group">
                <span>{t("search_suspicious_users")}</span>
                <input
                  className="ui-input"
                  value={fraudSearch}
                  onChange={(event) => setFraudSearch(event.target.value)}
                  placeholder={t("search_by_name_or_card")}
                />
              </label>
            </div>
            <div className="list-grid">
              {overview.fraudAlerts.filter((entry) => {
                const query = fraudSearch.trim().toLowerCase();
                return !query
                  || entry.name.toLowerCase().includes(query)
                  || entry.rationCardNumber.toLowerCase().includes(query);
              }).length ? (
                overview.fraudAlerts
                  .filter((entry) => {
                    const query = fraudSearch.trim().toLowerCase();
                    return !query
                      || entry.name.toLowerCase().includes(query)
                      || entry.rationCardNumber.toLowerCase().includes(query);
                  })
                  .map((entry) => (
                  <article
                    key={`${entry.userId}-${entry.rationCardNumber}`}
                    className="list-card warning-card"
                  >
                    <h3>{entry.name}</h3>
                    <p>{entry.rationCardNumber}</p>
                    <p>Fraud score: {entry.fraudScore}</p>
                    <p>{entry.reasons.join(", ")}</p>
                  </article>
                  ))
              ) : (
                <p>{t("no_suspicious_activity")}</p>
              )}
            </div>
          </section>

          <section className="panel-card">
            <h2>Top 5 Suspicious Users</h2>
            <div className="list-grid compact-grid">
              {overview.topSuspiciousUsers?.map((entry) => (
                <article key={entry.userId} className="list-card warning-card">
                  <h3>{entry.name}</h3>
                  <p>{entry.rationCardNumber}</p>
                  <p>Fraud score: {entry.fraudScore}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("corruption_twin_score")}</h2>
            <div className="list-grid">
              {overview.dealerRiskAlerts.length ? (
                overview.dealerRiskAlerts.map((entry) => (
                  <article key={entry.shopId} className="list-card warning-card">
                    <h3>{entry.shopName}</h3>
                    <p>{entry.dealerName || "Dealer"}</p>
                    <p>Dealer risk score: {entry.dealerFraudScore}</p>
                    <p>{entry.reasons.join(", ")}</p>
                  </article>
                ))
              ) : (
                <p>{t("no_dealer_corruption")}</p>
              )}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("explainable_ai_panel")}</h2>
            <div className="list-grid">
              {overview.explainableFraudPanel.length ? (
                overview.explainableFraudPanel.map((entry) => (
                  <article key={entry.userId} className="list-card">
                    <h3>{entry.name}</h3>
                    <p>Fraud score: {entry.fraudScore}</p>
                    {entry.explainability?.map((reason) => (
                      <p key={reason.label}>
                        {reason.label} ({reason.impact})
                      </p>
                    ))}
                  </article>
                ))
              ) : (
                <p>{t("no_explainable_alerts")}</p>
              )}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("busy_time_heatmap")}</h2>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overview.bookingHeatmap}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="slotTime" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookingsCount" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("daily_usage_trend")}</h2>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={overview.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={3} />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#0f766e"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("demand_prediction_panel")}</h2>
            <div className="list-grid">
              {overview.demandInsights.map((entry) => (
                <article key={entry.slotId} className="list-card">
                  <h3>{entry.slotTime}</h3>
                  <p>Predicted demand: {entry.predictedDemand}</p>
                  <p>Capacity: {entry.capacity}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("queue_monitoring")}</h2>
            <div className="list-grid compact-grid">
              {overview.queueStatus.map((entry) => (
                <article key={entry.slotId} className="list-card">
                  <h3>{entry.slotTime}</h3>
                  <p>{new Date(entry.date).toLocaleDateString()}</p>
                  <p>
                    Queue: {entry.bookedCount} / {entry.maxLimit}
                  </p>
                  <p>Fill rate: {entry.fillRate}%</p>
                  <p>Predicted demand: {entry.predictedDemand}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("recent_grievances")}</h2>
            <div className="list-grid">
              {overview.grievances.length ? (
                overview.grievances.map((entry) => (
                  <article key={entry._id} className="list-card">
                    <h3>{entry.user?.name}</h3>
                    <p>{entry.category}</p>
                    <p>{entry.description}</p>
                    <p>Status: {entry.status}</p>
                  </article>
                ))
              ) : (
                <p>{t("no_grievances_reported")}</p>
              )}
            </div>
          </section>

          <section className="panel-card split-grid">
            <form className="form-grid" onSubmit={handleCreateShop}>
              <h2>{t("shop_management")}</h2>
              <label>
                Shop ID
                <input name="shopId" value={shopForm.shopId} onChange={handleShopFieldChange} required />
              </label>
              <label>
                Shop name
                <input
                  name="shopName"
                  value={shopForm.shopName}
                  onChange={handleShopFieldChange}
                  required
                />
              </label>
              <label>
                Dealer name
                <input
                  name="dealerName"
                  value={shopForm.dealerName}
                  onChange={handleShopFieldChange}
                />
              </label>
              <label>
                Location
                <input
                  name="location"
                  value={shopForm.location}
                  onChange={handleShopFieldChange}
                  required
                />
              </label>
              <label>
                Rice stock
                <input
                  name="stock.rice"
                  type="number"
                  min="0"
                  value={shopForm.stock.rice}
                  onChange={handleShopFieldChange}
                />
              </label>
              <label>
                Wheat stock
                <input
                  name="stock.wheat"
                  type="number"
                  min="0"
                  value={shopForm.stock.wheat}
                  onChange={handleShopFieldChange}
                />
              </label>
              <label>
                Sugar stock
                <input
                  name="stock.sugar"
                  type="number"
                  min="0"
                  value={shopForm.stock.sugar}
                  onChange={handleShopFieldChange}
                />
              </label>
              <label>
                Kerosene stock
                <input
                  name="stock.kerosene"
                  type="number"
                  min="0"
                  value={shopForm.stock.kerosene}
                  onChange={handleShopFieldChange}
                />
              </label>
              <Button variant="primary" type="submit">{t("add_shop")}</Button>
            </form>

            <div className="nested-panel">
              <h2>{t("archived_records")}</h2>
              <div className="admin-list">
                {overview.archives.map((archive) => (
                  <article key={archive._id} className="list-card">
                    <h3>
                      {archive.periodType === "monthly"
                        ? `${archive.year}-${String(archive.month).padStart(2, "0")}`
                        : `${archive.year}`}
                    </h3>
                    <p>Bookings: {archive.totals.bookings}</p>
                    <p>Transactions: {archive.totals.transactions}</p>
                    <p>Fraud cases: {archive.totals.fraudCases}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="panel-card split-grid">
            <form className="form-grid" onSubmit={handleHistorySearch}>
              <h2>Activity History</h2>
              <label>
                User
                <select name="userId" value={historyFilters.userId} onChange={handleHistoryFilterChange}>
                  <option value="">All users</option>
                  {overview.users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Action
                <select name="action" value={historyFilters.action} onChange={handleHistoryFilterChange}>
                  <option value="">All actions</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="booking">Booking</option>
                  <option value="purchase">Purchase</option>
                </select>
              </label>
              <label>
                Date
                <input name="date" type="date" value={historyFilters.date} onChange={handleHistoryFilterChange} />
              </label>
              <div className="inline-actions">
                <Button variant="primary" type="submit">Apply Filters</Button>
                <Button variant="ghost" type="button" onClick={() => handleDownloadReport("history", "csv")}>
                  Download History CSV
                </Button>
                <Button variant="ghost" type="button" onClick={() => handleDownloadReport("purchase", "csv")}>
                  Download Purchase CSV
                </Button>
                <Button variant="ghost" type="button" onClick={() => handleDownloadReport("fraud", "pdf")}>
                  Download Fraud PDF
                </Button>
              </div>
            </form>

            <div className="nested-panel">
              <h2>Recent User Activity</h2>
              <div className="admin-list">
                {historyEntries.map((entry) => (
                  <article
                    key={entry._id}
                    className={`list-card ${entry.user?.flagged ? "warning-card" : ""}`}
                  >
                    <h3>{entry.user?.name || "Unknown user"}</h3>
                    <p>{entry.user?.rationCardNumber || "-"}</p>
                    <p>{entry.actionType}</p>
                    <p>{new Date(entry.timestamp).toLocaleString()}</p>
                    <p>{entry.device || "Unknown device"}</p>
                    <p>{entry.ipAddress || "-"}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="panel-card split-grid">
            <form className="form-grid" onSubmit={handleSendNotification}>
              <h2>{t("notification_system")}</h2>
              <label>
                Alert title
                <input
                  name="title"
                  value={notificationForm.title}
                  onChange={handleNotificationChange}
                  required
                />
              </label>
              <label>
                Alert message
                <input
                  name="message"
                  value={notificationForm.message}
                  onChange={handleNotificationChange}
                  required
                />
              </label>
              <label>
                Ration card number
                <input
                  name="rationCardNumber"
                  value={notificationForm.rationCardNumber}
                  onChange={handleNotificationChange}
                  placeholder="Leave empty for broadcast"
                />
              </label>
              <Button variant="primary" type="submit">{t("send_alert")}</Button>
            </form>

            <div className="nested-panel">
              <h2>{t("recent_audit_logs")}</h2>
              <div className="admin-list">
                {overview.auditLogs.map((log) => (
                  <article key={log._id} className="list-card">
                    <h3>{log.action}</h3>
                    <p>
                      {log.entityType} / {log.entityId}
                    </p>
                    <p>{new Date(log.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="panel-card">
            <h2>{t("offline_kiosk_booking")}</h2>
            <form className="form-grid" onSubmit={handleManualBooking}>
              <label>
                Citizen ration card
                <input
                  name="rationCardNumber"
                  value={manualBooking.rationCardNumber}
                  onChange={handleChange}
                  placeholder="TN-CHN-1001"
                  required
                />
              </label>
              <label>
                Shop
                <select name="shopId" value={manualBooking.shopId} onChange={handleChange} required>
                  <option value="">Choose shop</option>
                  {shops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.shopName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Slot
                <select name="slotId" value={manualBooking.slotId} onChange={handleChange} required>
                  <option value="">Choose slot</option>
                  {slots.map((slot) => (
                    <option key={slot._id} value={slot._id}>
                      {slot.slotTime}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  name="date"
                  type="date"
                  value={manualBooking.date}
                  onChange={handleChange}
                  required
                />
              </label>
              {manualMessage && <p className="success-text">{manualMessage}</p>}
              <div className="inline-actions">
                <Button variant="primary" type="submit">Book via kiosk</Button>
                <Link className="ui-button ui-button-ghost" to="/fraud-panel">
                  <span>{t("open_fraud_panel")}</span>
                </Link>
              </div>
            </form>
          </section>
        </>
      )}
    </Layout>
  );
};

export default AdminPage;
