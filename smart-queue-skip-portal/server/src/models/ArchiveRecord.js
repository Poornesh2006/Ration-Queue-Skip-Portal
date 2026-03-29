import mongoose from "mongoose";

const archiveRecordSchema = new mongoose.Schema(
  {
    periodType: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      default: null,
      min: 1,
      max: 12,
    },
    totals: {
      bookings: { type: Number, default: 0 },
      transactions: { type: Number, default: 0 },
      fraudCases: { type: Number, default: 0 },
      blockedUsers: { type: Number, default: 0 },
    },
    queuePeaks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    stockHistory: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

archiveRecordSchema.index(
  { periodType: 1, year: 1, month: 1 },
  { unique: true, partialFilterExpression: { month: { $type: "number" } } }
);
archiveRecordSchema.index(
  { periodType: 1, year: 1 },
  { unique: true, partialFilterExpression: { periodType: "yearly" } }
);

export const ArchiveRecord = mongoose.model("ArchiveRecord", archiveRecordSchema);
