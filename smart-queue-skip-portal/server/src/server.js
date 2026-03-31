import dotenv from "dotenv";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { Booking } from "./models/Booking.js";

dotenv.config();

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI not defined");
      throw new Error("MONGO_URI is not configured");
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error("JWT_SECRET not defined or too short");
      throw new Error("JWT_SECRET must be set and at least 32 characters long");
    }

    await connectDB();
    await Booking.syncIndexes();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
