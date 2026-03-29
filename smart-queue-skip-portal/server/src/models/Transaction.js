import mongoose from "mongoose";

const transactionItemSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    items: {
      type: [transactionItemSchema],
      required: true,
      validate: [(items) => items.length > 0, "At least one item is required"],
    },
    transactionDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, transactionDate: -1 });
transactionSchema.index({ shop: 1, transactionDate: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
