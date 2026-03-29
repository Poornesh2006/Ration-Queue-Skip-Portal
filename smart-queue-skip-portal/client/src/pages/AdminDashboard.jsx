import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardCard from "../components/DashboardCard";
import ChartCard from "../components/ChartCard";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import { adminService } from "../services/adminService";

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [overviewResponse, analyticsResponse] = await Promise.all([
          adminService.getOverview(),
          adminService.getAnalytics(),
        ]);
        setOverview(overviewResponse);
        setAnalytics(analyticsResponse);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const freeVsPaidData = overview
    ? [
        {
          name: "Free",
          value: overview.products.filter((product) => product.type === "free").length,
        },
        {
          name: "Paid",
          value: overview.products.filter((product) => product.type === "paid").length,
        },
      ]
    : [];

  return (
    <Layout title="Admin Dashboard">
      {loading && <LoadingSpinner label="Loading admin dashboard..." />}
      {error && <p className="error-text">{error}</p>}

      {overview && analytics && (
        <>
          <section className="dashboard-hero panel-card">
            <div>
              <p className="eyebrow">Tamil Nadu Command Center</p>
              <h2>Real-time PDS intelligence</h2>
              <p>
                Monitor bookings, users, fraud alerts, and product movement from a single
                responsive control room.
              </p>
            </div>
            <div className="dashboard-hero-glow" />
          </section>

          <section className="dashboard-card-grid">
            <DashboardCard icon="👥" label="Total Users" value={overview.metrics.totalUsers} accent="green" />
            <DashboardCard icon="📦" label="Total Bookings" value={overview.metrics.totalBookings} accent="yellow" />
            <DashboardCard icon="🚨" label="Fraud Alerts" value={overview.metrics.suspiciousCases} accent="red" />
            <DashboardCard icon="💰" label="Revenue" value={`Rs ${analytics.totals.totalPurchases}`} accent="blue" />
          </section>

          <section className="dashboard-chart-grid">
            <ChartCard title="Daily Bookings">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={overview.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="bookings" stroke="#2E7D32" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Product Distribution">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.graphData.purchaseTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="item" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#FFD600" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Free vs Paid Items">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={freeVsPaidData} dataKey="value" nameKey="name" outerRadius={90}>
                    {freeVsPaidData.map((entry) => (
                      <Cell key={entry.name} fill={entry.name === "Free" ? "#2E7D32" : "#FFD600"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Activity Trends">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.graphData.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="login" stroke="#2563eb" fill="#2563eb33" />
                  <Area type="monotone" dataKey="booking" stroke="#2E7D32" fill="#2E7D3233" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        </>
      )}
    </Layout>
  );
};

export default AdminDashboard;
