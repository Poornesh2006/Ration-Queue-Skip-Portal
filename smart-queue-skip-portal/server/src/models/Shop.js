import mongoose from "mongoose";

const stockSchema = new mongoose.Schema(
  {
    rice: { type: Number, default: 0, min: 0 },
    wheat: { type: Number, default: 0, min: 0 },
    sugar: { type: Number, default: 0, min: 0 },
    kerosene: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const shopSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    dealerName: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: stockSchema,
      default: () => ({}),
    },
    initialStock: {
      type: stockSchema,
      default: () => ({}),
    },
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Shop = mongoose.model("Shop", shopSchema);
