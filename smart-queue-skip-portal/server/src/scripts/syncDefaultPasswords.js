import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

dotenv.config();

const DEFAULT_PASSWORDS = {
  admin: "Admin@123",
  shop_owner: "Owner@123",
  user: "Password@123",
};

const syncDefaultPasswords = async () => {
  try {
    await connectDB();

    const users = await User.find().select("+password");

    for (const user of users) {
      const nextPassword = DEFAULT_PASSWORDS[user.role] || DEFAULT_PASSWORDS.user;
      user.password = await bcrypt.hash(nextPassword, 10);
      await user.save();
    }

    console.log("Default passwords synced successfully");
    console.log("Admin password: Admin@123");
    console.log("Citizen password: Password@123");
    console.log("Shop owner password: Owner@123");
  } catch (error) {
    console.error("Failed to sync default passwords", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

syncDefaultPasswords();
