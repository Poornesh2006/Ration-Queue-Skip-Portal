import mongoose from "mongoose";

const grievanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    category: {
      type: String,
      enum: ["overcharging", "denied_stock", "delay", "corruption", "other"],
      default: "other",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    proofUrl: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

export const Grievance = mongoose.model("Grievance", grievanceSchema);
