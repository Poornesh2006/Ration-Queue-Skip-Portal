import { AuditLog } from "../models/AuditLog.js";

export const createAuditLog = async ({
  entityType,
  entityId,
  action,
  actorId = null,
  payload = {},
}) => {
  const previousLog = await AuditLog.findOne().sort({ createdAt: -1 });
  const previousHash = previousLog?.hash || "GENESIS";
  const hash = AuditLog.buildHash({
    entityType,
    entityId,
    action,
    previousHash,
    payload,
  });

  return AuditLog.create({
    entityType,
    entityId,
    action,
    actorId,
    payload,
    previousHash,
    hash,
  });
};
