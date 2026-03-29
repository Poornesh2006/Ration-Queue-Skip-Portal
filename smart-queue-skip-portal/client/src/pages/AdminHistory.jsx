import { useEffect, useState } from "react";
import Button from "../components/Button";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import { adminService } from "../services/adminService";

const AdminHistory = () => {
  const [users, setUsers] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    date: "",
    page: 1,
    limit: 25,
  });

  const loadHistory = async (nextFilters = filters) => {
    try {
      const [usersResponse, historyResponse] = await Promise.all([
        adminService.getUsers(),
        adminService.getHistory(nextFilters),
      ]);

      setUsers(usersResponse.users);
      setHistoryEntries(historyResponse.history);
      setPagination(historyResponse.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load admin history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleChange = (event) => {
    const value = event.target.name === "page" || event.target.name === "limit"
      ? Number(event.target.value)
      : event.target.value;

    setFilters((current) => ({
      ...current,
      [event.target.name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    await loadHistory({ ...filters, page: 1 });
  };

  const handlePageChange = async (page) => {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    setLoading(true);
    await loadHistory(nextFilters);
  };

  return (
    <Layout title="Admin History">
      {loading && <LoadingSpinner label="Loading history..." />}
      {error && <p className="error-text">{error}</p>}

      <section className="panel-card split-grid">
        <form className="form-grid" onSubmit={handleSubmit}>
          <h2>Activity Filters</h2>
          <label>
            User
            <select name="userId" value={filters.userId} onChange={handleChange}>
              <option value="">All users</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action
            <select name="action" value={filters.action} onChange={handleChange}>
              <option value="">All actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="booking">Booking</option>
              <option value="purchase">Purchase</option>
            </select>
          </label>
          <label>
            Date
            <input name="date" type="date" value={filters.date} onChange={handleChange} />
          </label>
          <label>
            Page size
            <select name="limit" value={filters.limit} onChange={handleChange}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <div className="inline-actions">
            <Button variant="primary" type="submit">Apply Filters</Button>
            <Button variant="ghost" type="button" onClick={() => adminService.downloadReport({ type: "history", format: "csv" }).then(({ blob }) => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "history-report.csv";
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
            })}>
              Download CSV
            </Button>
          </div>
        </form>

        <div className="nested-panel">
          <h2>Recent Activity</h2>
          <div className="admin-list">
            {historyEntries.map((entry) => (
              <article key={entry._id} className={`list-card ${entry.user?.flagged ? "warning-card" : ""}`}>
                <h3>{entry.user?.name || "Unknown user"}</h3>
                <p>{entry.user?.rationCardNumber || "-"}</p>
                <p>Action: {entry.actionType}</p>
                <p>{new Date(entry.timestamp).toLocaleString()}</p>
                <p>Device: {entry.device || "Unknown device"}</p>
                <p>IP: {entry.ipAddress || "-"}</p>
              </article>
            ))}
          </div>
          {pagination && (
            <div className="inline-actions">
              <Button
                variant="ghost"
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <Button
                variant="ghost"
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AdminHistory;
