import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  if (mongoUri.includes("your_mongodb_atlas_url")) {
    throw new Error("MONGO_URI is still using the placeholder value in server/.env");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};
