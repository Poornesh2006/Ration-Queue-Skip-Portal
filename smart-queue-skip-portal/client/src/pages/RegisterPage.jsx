import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    rationCardNumber: "",
    familyMembers: 1,
    age: 18,
    isDisabled: false,
    emergencyAccess: false,
    phone: "",
    aadhaarNumber: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.name === "familyMembers" || event.target.name === "age"
          ? Number(event.target.value)
          : event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await register(formData);
      navigate("/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed");
    }
  };

  return (
    <Layout title="Register">
      <section className="auth-card">
        <h2>Create a ration queue account</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input name="name" value={formData.name} onChange={handleChange} required />
          </label>
          <label>
            Ration Card Number
            <input
              name="rationCardNumber"
              value={formData.rationCardNumber}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Family Members
            <input
              name="familyMembers"
              type="number"
              min="1"
              value={formData.familyMembers}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Age
            <input
              name="age"
              type="number"
              min="0"
              value={formData.age}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Phone Number
            <input name="phone" value={formData.phone} onChange={handleChange} required />
          </label>
          <label>
            Aadhaar Number
            <input
              name="aadhaarNumber"
              value={formData.aadhaarNumber}
              onChange={handleChange}
              placeholder="12-digit Aadhaar number"
            />
          </label>
          <label className="checkbox-row">
            <input
              name="isDisabled"
              type="checkbox"
              checked={formData.isDisabled}
              onChange={handleChange}
            />
            Disabled beneficiary
          </label>
          <label className="checkbox-row">
            <input
              name="emergencyAccess"
              type="checkbox"
              checked={formData.emergencyAccess}
              onChange={handleChange}
            />
            Emergency access required
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="helper-text">
          Already registered? <Link to="/login">Go to login</Link>
        </p>
      </section>
    </Layout>
  );
};

export default RegisterPage;
