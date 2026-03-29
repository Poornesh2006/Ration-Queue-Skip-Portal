import crypto from "crypto";
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousHash: {
      type: String,
      default: "GENESIS",
    },
    hash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

auditLogSchema.statics.buildHash = function buildHash({ entityType, entityId, action, previousHash, payload }) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ entityType, entityId, action, previousHash, payload }))
    .digest("hex");
};

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
