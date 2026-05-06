import { prisma } from "../lib/prisma.js";

export async function logAudit({ userId, entityType, entityId, action, details }) {
  return prisma.auditLog.create({
    data: {
      userId,
      entityType,
      entityId: entityId ?? null,
      action,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
