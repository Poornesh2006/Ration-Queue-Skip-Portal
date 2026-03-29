import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ["login", "logout", "purchase", "booking"],
      required: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    device: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

historySchema.index({ user: 1, timestamp: -1 });
historySchema.index({ actionType: 1, timestamp: -1 });

export const History = mongoose.model("History", historySchema);
