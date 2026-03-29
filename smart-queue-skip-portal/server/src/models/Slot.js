import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    slotTime: {
      type: String,
      required: true,
      trim: true,
    },
    slotDate: {
      type: Date,
      default: null,
      index: true,
    },
    maxLimit: {
      type: Number,
      default: 20,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    priorityOnly: {
      type: Boolean,
      default: false,
    },
    priorityCategory: {
      type: String,
      enum: ["standard", "elderly", "disabled", "emergency"],
      default: "standard",
    },
    isDynamic: {
      type: Boolean,
      default: false,
    },
    predictedDemand: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

slotSchema.index({ slotDate: 1, slotTime: 1 });

export const Slot = mongoose.model("Slot", slotSchema);
