import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
import { createAuditLog, logTicketStatusChange } from "@/lib/audit";
import { notifyApprovalRequest } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "EMPLOYEE", "MANAGER");

    const body = await request.json();
    const { modelId, reason, targetDeptId } = body;

    if (!modelId || !reason) {
      return Response.json(
        { error: "modelId and reason are required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const model = await tx.assetModel.findUnique({ where: { id: modelId } });
      if (!model) {
        throw new WorkflowError("Asset model not found");
      }

      const initialStatus = TicketWorkflow.determineInitialStatus("APPLY", {
        isManager: user.role === "MANAGER",
        purchasePrice: Number(model.purchasePrice),
      });

      const ticket = await tx.ticket.create({
        data: {
          type: "APPLY",
          status: initialStatus,
          applicantId: user.userId,
          targetModelId: modelId,
          reason,
          targetDeptId: targetDeptId ?? null,
        },
      });

      await logTicketStatusChange(tx, {
        ticketId: ticket.id,
        operatorId: user.userId,
        fromStatus: "SUBMITTED",
        toStatus: initialStatus,
        metadata: { modelId, purchasePrice: Number(model.purchasePrice) },
      });

      // Notify department manager if pending manager approval
      if (initialStatus === "PENDING_MANAGER_1") {
        const dept = await tx.department.findUnique({
          where: { id: user.deptId },
          include: { manager: true },
        });
        if (dept?.manager) {
          await notifyApprovalRequest(tx, {
            managerId: dept.manager.id,
            ticketId: ticket.id,
            applicantName: "",
            ticketType: "APPLY",
          });
        }
      }

      return ticket;
    });

    return Response.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof WorkflowError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
