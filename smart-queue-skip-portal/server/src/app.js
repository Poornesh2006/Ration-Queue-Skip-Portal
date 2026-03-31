import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import fraudRoutes from "./routes/fraudRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import grievanceRoutes from "./routes/grievanceRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { applySecurityHeaders } from "./middleware/securityMiddleware.js";
import { startNotificationScheduler } from "./services/notificationService.js";

dotenv.config();

export const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes("*");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(applySecurityHeaders);
app.use(express.json({ limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.send("Backend Running Successfully");
});

app.get("/api/health", (_req, res) => {
  res.json({ message: "Smart Queue Skip Portal API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/book", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/history", historyRoutes);

startNotificationScheduler();

app.use(notFound);
app.use(errorHandler);
