import mongoose from "mongoose";

const fraudSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["user", "shop"],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reasons: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved"],
      default: "open",
    },
    explainability: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

fraudSchema.index({ entityType: 1, score: -1, updatedAt: -1 });
fraudSchema.index({ user: 1 }, { sparse: true });
fraudSchema.index({ shop: 1 }, { sparse: true });

export const Fraud = mongoose.model("Fraud", fraudSchema);
