import { motion } from "framer-motion";

const Card = ({ children, className = "", accent = "", ...props }) => (
  <motion.section
    className={`ui-card ${accent ? `ui-card-${accent}` : ""} ${className}`.trim()}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: "easeOut" }}
    whileHover={{ y: -4 }}
    {...props}
  >
    {children}
  </motion.section>
);

export default Card;
