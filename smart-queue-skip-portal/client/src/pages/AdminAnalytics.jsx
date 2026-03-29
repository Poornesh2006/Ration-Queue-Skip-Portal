import { useEffect, useState } from "react";
import {
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
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import { adminService } from "../services/adminService";

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await adminService.getAnalytics();
        setAnalytics(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load admin analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  return (
    <Layout title="Admin Analytics">
      {loading && <LoadingSpinner label="Loading analytics..." />}
      {error && <p className="error-text">{error}</p>}

      {analytics && (
        <>
          <section className="stats-grid admin-stats-grid">
            <article className="metric-card">
              <strong>{analytics.totals.totalUsers}</strong>
              <span>Total users</span>
            </article>
            <article className="metric-card">
              <strong>{analytics.totals.totalBookings}</strong>
              <span>Total bookings</span>
            </article>
            <article className="metric-card">
              <strong>{analytics.totals.totalPurchases}</strong>
              <span>Total purchases</span>
            </article>
            <article className="metric-card danger-metric">
              <strong>{analytics.totals.fraudCount}</strong>
              <span>Fraud alerts</span>
            </article>
          </section>

          <section className="panel-card">
            <h2>Daily Activity</h2>
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
              <h2>Peak Hours</h2>
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
              <h2>Fraud Score Distribution</h2>
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
              <h2>Item-wise Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={analytics.graphData.purchaseTrends} dataKey="quantity" nameKey="item" outerRadius={95}>
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
    </Layout>
  );
};

export default AdminAnalytics;
