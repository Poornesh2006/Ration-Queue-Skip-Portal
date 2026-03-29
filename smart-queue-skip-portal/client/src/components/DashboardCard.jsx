import { motion } from "framer-motion";

const DashboardCard = ({ icon, label, value, accent = "green", subtitle }) => (
  <motion.article
    className={`dashboard-stat-card dashboard-stat-${accent}`}
    whileHover={{ y: -6, scale: 1.01 }}
    transition={{ duration: 0.18 }}
  >
    <div className="dashboard-stat-icon">{icon}</div>
    <div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  </motion.article>
);

export default DashboardCard;
