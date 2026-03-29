import { motion } from "framer-motion";

const ChartCard = ({ title, children, actions }) => (
  <motion.section
    className="chart-shell"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
  >
    <div className="chart-shell-header">
      <h2>{title}</h2>
      {actions ? <div className="chart-shell-actions">{actions}</div> : null}
    </div>
    <div className="chart-shell-body">{children}</div>
  </motion.section>
);

export default ChartCard;
