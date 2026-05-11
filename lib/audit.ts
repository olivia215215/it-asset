import type { Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  action: string;
  operatorId: string;
  targetType: string;
  targetId: string;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(
  tx: Prisma.TransactionClient,
  params: CreateAuditLogParams,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      action: params.action,
      operatorId: params.operatorId,
      targetType: params.targetType,
      targetId: params.targetId,
      beforeSnapshot: (params.beforeSnapshot ?? null) as Prisma.InputJsonValue,
      afterSnapshot: (params.afterSnapshot ?? null) as Prisma.InputJsonValue,
      metadata: (params.metadata ?? null) as Prisma.InputJsonValue,
    },
  });
}

export async function logAssetStatusChange(
  tx: Prisma.TransactionClient,
  params: {
    assetId: string;
    operatorId: string;
    fromStatus: string;
    toStatus: string;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await createAuditLog(tx, {
    action: `ASSET_STATUS_CHANGE:${params.fromStatus}->${params.toStatus}`,
    operatorId: params.operatorId,
    targetType: "ASSET_INSTANCE",
    targetId: params.assetId,
    metadata: params.metadata ?? null,
  });
}

export async function logTicketStatusChange(
  tx: Prisma.TransactionClient,
  params: {
    ticketId: string;
    operatorId: string;
    fromStatus: string;
    toStatus: string;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await createAuditLog(tx, {
    action: `TICKET_STATUS_CHANGE:${params.fromStatus}->${params.toStatus}`,
    operatorId: params.operatorId,
    targetType: "TICKET",
    targetId: params.ticketId,
    metadata: params.metadata ?? null,
  });
}
