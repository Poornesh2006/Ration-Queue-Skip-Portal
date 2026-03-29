import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Booking } from "../models/Booking.js";
import { Shop } from "../models/Shop.js";
import { Slot } from "../models/Slot.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetDir = path.resolve(__dirname, "../../data");
const fallbackDatasetDir = path.resolve(__dirname, "../../../datasets");

const readDataset = async (fileName) => {
  const filePath = path.join(datasetDir, fileName);
  const fallbackPath = path.join(fallbackDatasetDir, fileName);
  let content;

  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    content = await fs.readFile(fallbackPath, "utf8");
  }

  return JSON.parse(content);
};

const normalizeDate = (value) => new Date(value);
const ensureReference = (value, message) => {
  if (!value) {
    throw new Error(message);
  }

  return value;
};

const mapUserRecord = (user) => ({
  name: user.name,
  rationCardNumber: user.ration_card_number || user.rationCardNumber,
  aadhaarNumber: user.aadhaar_number || user.aadhaarNumber,
  familyMembers: user.family_members || user.familyMembers,
  age: user.age || 18,
  isDisabled: user.is_disabled || user.isDisabled || false,
  emergencyAccess: user.emergency_access || user.emergencyAccess || false,
  phone: user.phone_number || user.phone,
  city: user.address?.district || user.city || "",
  village: user.address?.area || user.village || "",
  pincode: user.address?.pincode || user.pincode || "",
  cardType: user.card_type || user.cardType || "NPHH",
  profileImage: user.profile_image || user.profileImage || "/images/misc/user1.png",
  faceImage: user.face_image || user.faceImage || user.profile_image || user.profileImage || "",
  password:
    user.password ||
    (user.role === "admin" ? "Admin@123" : user.role === "shop_owner" ? "Owner@123" : "Password@123"),
  role: user.role || "user",
  isVerified: Boolean(user.aadhaar_number || user.aadhaarNumber),
  flagged: user.flagged || false,
});

const mapShopRecord = (shop) => ({
  shopId: shop.shop_id || shop.shopId,
  shopName: shop.shop_name || shop.shopName,
  location: shop.location,
  dealerName: shop.dealer_name || shop.dealerName || "",
  stock: shop.stock,
});

const mapSlotRecord = (slot) => ({
  slotTime: slot.slot_time || slot.slotTime,
  slotDate: slot.date ? normalizeDate(slot.date) : null,
  maxLimit: slot.max_limit || slot.maxLimit || 20,
  bookedCount: slot.booked_count || slot.bookedCount || 0,
  priorityOnly: slot.priority_only || slot.priorityOnly || false,
  priorityCategory: slot.priority_category || slot.priorityCategory || "standard",
  isDynamic: slot.is_dynamic || slot.isDynamic || false,
});

const mapProductRecord = (product) => ({
  name: product.name,
  sku: product.sku,
  category: product.category,
  type: product.type || "paid",
  unit: product.unit || "kg",
  stockAvailable: product.stockAvailable || 0,
  reorderLevel: product.reorderLevel || 20,
  price: product.price || 0,
  notes: product.notes || "",
});

const seed = async () => {
  try {
    await connectDB();

    await Promise.all([
      Booking.deleteMany({}),
      Transaction.deleteMany({}),
      Slot.deleteMany({}),
      Shop.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({}),
    ]);

    const [userData, shopData, slotData, bookingData, transactionData, productData] = await Promise.all([
      readDataset("users.json"),
      readDataset("shops.json"),
      readDataset("slots.json"),
      readDataset("bookings.json"),
      readDataset("transactions.json"),
      readDataset("products.json"),
    ]);

    const normalizedUsers = userData.map(mapUserRecord);
    const normalizedShops = shopData.map(mapShopRecord);
    const normalizedSlots = slotData.map(mapSlotRecord);
    const normalizedProducts = productData.map(mapProductRecord);

    const users = await User.insertMany(
      await Promise.all(
        normalizedUsers.map(async (user) => ({
          ...user,
          password: await bcrypt.hash(user.password, 10),
        }))
      )
    );
    const shops = await Shop.insertMany(
      normalizedShops.map((shop) => ({
        ...shop,
        initialStock: shop.stock,
      }))
    );
    const slots = await Slot.insertMany(normalizedSlots);
    await Product.insertMany(normalizedProducts);

    const userMap = new Map([
      ...users.map((user) => [user.rationCardNumber, user._id]),
      ...userData
        .filter((user) => user.user_id)
        .map((user, index) => [user.user_id, users[index]._id]),
    ]);
    const shopMap = new Map(shops.map((shop) => [shop.shopId, shop._id]));
    const slotMap = new Map([
      ...slots.map((slot) => [slot.slotTime, slot._id]),
      ...slotData
        .filter((slot) => slot.slot_id)
        .map((slot, index) => [slot.slot_id, slots[index]._id]),
    ]);

    const bookings = await Booking.insertMany(
      bookingData.map((booking) => ({
        user: ensureReference(
          userMap.get(booking.user_id || booking.rationCardNumber),
          `Missing user for ${booking.user_id || booking.rationCardNumber}`
        ),
        shop: ensureReference(
          shopMap.get(booking.shop_id || booking.shopId),
          `Missing shop for ${booking.shop_id || booking.shopId}`
        ),
        slot: ensureReference(
          slotMap.get(booking.slot_id || booking.slotTime),
          `Missing slot for ${booking.slot_id || booking.slotTime}`
        ),
        date: normalizeDate(booking.date),
        status: booking.status || "booked",
        bookingSource: booking.bookingSource || "app",
        qrCodeToken:
          booking.qrCodeToken ||
          `SEEDED-${booking.user_id || booking.rationCardNumber}-${booking.shop_id || booking.shopId}`,
      }))
    );

    const slotBookingCount = bookings.reduce((acc, booking) => {
      const key = booking.slot.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    await Promise.all(
      slots.map((slot) =>
        Slot.findByIdAndUpdate(slot._id, {
          bookedCount: slotBookingCount[slot._id.toString()] || 0,
        })
      )
    );

    await Transaction.insertMany(
      transactionData.map((transaction) => ({
        user: ensureReference(
          userMap.get(transaction.user_id || transaction.rationCardNumber),
          `Missing user for ${transaction.user_id || transaction.rationCardNumber}`
        ),
        shop: ensureReference(
          shopMap.get(transaction.shop_id || transaction.shopId),
          `Missing shop for ${transaction.shop_id || transaction.shopId}`
        ),
        items: transaction.items,
        transactionDate: normalizeDate(transaction.date),
      }))
    );

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seed();
