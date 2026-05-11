import type { Prisma } from "@prisma/client";
import { NotificationType } from "@prisma/client";

function ticketTypeName(type: string): string {
  const names: Record<string, string> = {
    APPLY: "申领",
    RETURN: "归还",
    REPAIR: "报修",
    TRANSFER: "调拨",
  };
  return names[type] ?? type;
}

export async function createNotification(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedTicketId?: string;
    relatedAssetId?: string;
  },
): Promise<void> {
  await tx.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedTicketId: params.relatedTicketId ?? null,
      relatedAssetId: params.relatedAssetId ?? null,
    },
  });
}

export async function notifyApprovalRequest(
  tx: Prisma.TransactionClient,
  params: {
    managerId: string;
    ticketId: string;
    applicantName: string;
    ticketType: string;
  },
): Promise<void> {
  await createNotification(tx, {
    userId: params.managerId,
    type: "APPROVAL_REQUEST",
    title: "审批请求",
    body: `${params.applicantName} 提交了${ticketTypeName(params.ticketType)}申请，请审批。`,
    relatedTicketId: params.ticketId,
  });
}

export async function notifyApprovalResult(
  tx: Prisma.TransactionClient,
  params: {
    applicantId: string;
    ticketId: string;
    approved: boolean;
    ticketType: string;
  },
): Promise<void> {
  const resultText = params.approved ? "已通过" : "被驳回";
  await createNotification(tx, {
    userId: params.applicantId,
    type: "APPROVAL_RESULT",
    title: "审批结果",
    body: `您的${ticketTypeName(params.ticketType)}申请${resultText}。`,
    relatedTicketId: params.ticketId,
  });
}
