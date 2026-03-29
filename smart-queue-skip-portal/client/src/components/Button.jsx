import { motion } from "framer-motion";

const Button = ({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) => (
  <motion.button
    type={type}
    className={`ui-button ui-button-${variant} ${className}`.trim()}
    whileHover={{ scale: 1.04, y: -1 }}
    whileTap={{ scale: 0.98 }}
    {...props}
  >
    <span>{children}</span>
  </motion.button>
);

export default Button;
