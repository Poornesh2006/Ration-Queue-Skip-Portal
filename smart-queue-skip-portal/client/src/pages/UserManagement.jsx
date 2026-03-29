import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import Layout from "../components/Layout";
import Skeleton from "../components/Skeleton";
import { adminService } from "../services/adminService";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data.users);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleBlock = async (userId) => {
    setError("");
    setMessage("");

    try {
      const data = await adminService.toggleUserBlock(userId);
      setMessage(data.message);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update user");
    }
  };

  const handleVerify = async (userId) => {
    setError("");
    setMessage("");

    try {
      const data = await adminService.verifyUser(userId);
      setMessage(data.message);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to verify user");
    }
  };

  return (
    <Layout title="User Management">
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <section className="panel-card">
        <h2>Citizen controls</h2>
        <div className="admin-list">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => (
              <article key={`user-skeleton-${index}`} className="list-card">
                <div className="card-heading">
                  <Skeleton className="skeleton-line skeleton-line-short" />
                  <Skeleton className="table-skeleton-chip" rounded />
                </div>
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line" />
                <div className="inline-actions">
                  <Skeleton className="table-skeleton-action" rounded />
                  <Skeleton className="table-skeleton-action" rounded />
                </div>
              </article>
            ))
          ) : users.length ? (
            users.map((user) => (
              <article key={user._id} className="list-card">
                <div className="card-heading">
                  <h3>{user.name}</h3>
                  <span className={`status-badge ${user.isBlocked ? "cancelled" : "completed"}`}>
                    {user.isBlocked ? "Blocked" : "Active"}
                  </span>
                </div>
                <p>{user.rationCardNumber}</p>
                <p>{user.phone}</p>
                <p>Role: {user.role}</p>
                <p>Card type: {user.cardType}</p>
                <p>Family size: {user.familyMembers}</p>
                <p>Aadhaar status: {user.isVerified ? "Verified" : "Pending"}</p>
                <p>Fraud score: {user.fraudScore || 0}</p>
                <p>
                  Entitlement: Rice {user.entitlement?.riceKg || user.entitlement?.rice || 0} kg,
                  Sugar {user.entitlement?.sugarKg || user.entitlement?.sugar || 0} kg,
                  Wheat {user.entitlement?.wheatKg || user.entitlement?.wheat || 0} kg,
                  Oil {user.entitlement?.oilLitres || user.entitlement?.oil || 0} L
                </p>
                <div className="inline-actions">
                  <button className="ghost-button" type="button" onClick={() => handleVerify(user._id)}>
                    {user.isVerified ? "Re-check Aadhaar" : "Verify Aadhaar"}
                  </button>
                  <button
                    className={`ghost-button ${user.isBlocked ? "" : "danger-button"}`}
                    type="button"
                    onClick={() => handleToggleBlock(user._id)}
                  >
                    {user.isBlocked ? "Unblock User" : "Block User"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title="No data available"
              description="No users are available to manage right now."
              icon="user"
            />
          )}
        </div>
      </section>
    </Layout>
  );
};

export default UserManagement;
