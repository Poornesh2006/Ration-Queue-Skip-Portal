import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminLogin, loading } = useAuth();
  const [formData, setFormData] = useState({
    adminId: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await adminLogin(formData);
      navigate("/admin/dashboard");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to sign in as admin. Make sure the backend was restarted after the auth update."
      );
    }
  };

  return (
    <div className="citizen-auth-page admin-auth-page">
      <div className="citizen-auth-glow" />
      <section className="citizen-auth-card">
        <p className="eyebrow">Admin Command Center</p>
        <h1>Admin Login</h1>
        <p className="hero-copy">
          Access stock controls, fraud monitoring, queue oversight, and transparency
          records from one place.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Admin ID
            <input
              name="adminId"
              value={formData.adminId}
              onChange={handleChange}
              placeholder="TN-ADM-0001"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              required
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>

        <p className="helper-text">
          Need citizen access? <Link to="/login">Go to citizen login</Link>
        </p>
      </section>
    </div>
  );
};

export default AdminLogin;
