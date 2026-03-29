import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
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
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    bookingSource: {
      type: String,
      enum: ["app", "kiosk", "admin"],
      default: "app",
    },
    requestedItems: {
      type: [
        new mongoose.Schema(
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
        ),
      ],
      default: [],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["waived", "pending", "paid"],
      default: "waived",
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    receiptNumber: {
      type: String,
      trim: true,
      default: "",
    },
    qrCodeToken: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled"],
      default: "booked",
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ user: 1, date: 1 }, { unique: true });
bookingSchema.index({ slot: 1, date: 1, status: 1 });
bookingSchema.index({ shop: 1, date: 1, status: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
