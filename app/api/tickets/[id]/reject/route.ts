import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
import { AssetStateMachine, TransitionError } from "@/lib/asset-state-machine";
import { logAssetStatusChange, logTicketStatusChange } from "@/lib/audit";
import { notifyApprovalResult } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "MANAGER", "IT_ADMIN");

    const { id } = await params;
    const body = await request.json();
    const { rejectReason } = body;

    if (!rejectReason) {
      return Response.json({ error: "rejectReason is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { applicant: true, targetAsset: true },
      });
      if (!ticket) {
        throw new WorkflowError("Ticket not found");
      }

      const currentStatus = ticket.status as import("@prisma/client").TicketStatus;

      // Same role checks as approve
      if (currentStatus === "PENDING_MANAGER_1" || currentStatus === "PENDING_MANAGER_2") {
        if (user.role === "MANAGER") {
          const applicant = await tx.user.findUnique({
            where: { id: ticket.applicantId },
          });
          if (!applicant || applicant.deptId !== user.deptId) {
            throw new WorkflowError("You can only reject tickets for your own department");
          }
        }
      } else if (currentStatus === "PENDING_IT") {
        if (user.role !== "IT_ADMIN") {
          throw new WorkflowError("Only IT_ADMIN can reject at this stage");
        }
      } else if (currentStatus !== "APPROVED") {
        throw new WorkflowError(`Ticket cannot be rejected in ${currentStatus} status`);
      }

      // Recover asset status if applicable (RETURN -> AVAILABLE, REPAIR -> IN_USE)
      const assetChanges: Record<string, unknown>[] = [];
      if (ticket.targetAsset) {
        const assetType = ticket.type as import("@prisma/client").TicketType;
        if (assetType === "RETURN" && ticket.targetAsset.status === "RETURNING") {
          const transition = await AssetStateMachine.transition(
            tx,
            ticket.targetAsset.id,
            "AVAILABLE",
            { operatorId: user.userId },
          );
          assetChanges.push(transition.after);
          await logAssetStatusChange(tx, {
            assetId: ticket.targetAsset.id,
            operatorId: user.userId,
            fromStatus: "RETURNING",
            toStatus: "AVAILABLE",
            metadata: { ticketId: id, reason: "rejected" },
          });
        } else if (assetType === "REPAIR" && ticket.targetAsset.status === "REPAIRING") {
          const transition = await AssetStateMachine.transition(
            tx,
            ticket.targetAsset.id,
            "IN_USE",
            { operatorId: user.userId },
          );
          assetChanges.push(transition.after);
          await logAssetStatusChange(tx, {
            assetId: ticket.targetAsset.id,
            operatorId: user.userId,
            fromStatus: "REPAIRING",
            toStatus: "IN_USE",
            metadata: { ticketId: id, reason: "rejected" },
          });
        }
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectReason,
        },
      });

      await logTicketStatusChange(tx, {
        ticketId: id,
        operatorId: user.userId,
        fromStatus: currentStatus,
        toStatus: "REJECTED",
        metadata: { rejectReason },
      });

      await notifyApprovalResult(tx, {
        applicantId: ticket.applicantId,
        ticketId: id,
        approved: false,
        ticketType: ticket.type,
      });

      return { ticket: updated, assetChanges };
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof WorkflowError || e instanceof TransitionError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
