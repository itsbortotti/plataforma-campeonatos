import type { Prisma } from "@prisma/client";
import { prisma } from "../core/prisma.js";

export async function writeAudit(input: {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  return prisma.adminAuditLog.create({
    data: {
      userId: input.userId,
      userEmail: input.userEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description ?? null,
      details: input.details ?? undefined,
    },
  });
}
