import { motion } from "framer-motion";

const BookingSuccessState = ({
  title = "Booking Confirmed Successfully",
  description = "Redirecting to the next step...",
}) => (
  <motion.div
    className="booking-success-card"
    initial={{ opacity: 0, y: 18, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
  >
    <div className="booking-success-mark" aria-hidden="true">
      <motion.span
        className="booking-success-ring"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      <motion.span
        className="booking-success-check"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
      />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </motion.div>
);

export default BookingSuccessState;
