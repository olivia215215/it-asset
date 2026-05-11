import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { WorkflowError } from "@/lib/ticket-workflow";
import { AssetStateMachine, TransitionError } from "@/lib/asset-state-machine";
import { logAssetStatusChange, logTicketStatusChange } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);

    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { targetAsset: true },
      });
      if (!ticket) {
        throw new WorkflowError("Ticket not found");
      }

      const currentStatus = ticket.status as import("@prisma/client").TicketStatus;

      // Only applicant or IT_ADMIN can cancel
      if (ticket.applicantId !== user.userId && user.role !== "IT_ADMIN") {
        throw new WorkflowError("Only the applicant or IT admin can cancel this ticket");
      }

      // Cannot cancel terminal tickets
      if (["COMPLETED", "REJECTED", "CANCELLED"].includes(currentStatus)) {
        throw new WorkflowError(
          `Cannot cancel a ticket in ${currentStatus} status`,
        );
      }

      // Recover asset status if applicable
      const assetChanges: Record<string, unknown>[] = [];
      if (ticket.targetAsset) {
        const assetStatus = ticket.targetAsset.status;
        const ticketType = ticket.type as import("@prisma/client").TicketType;

        // Determine recovery status based on current asset status
        if (
          (ticketType === "RETURN" && assetStatus === "RETURNING") ||
          (ticketType === "REPAIR" && assetStatus === "REPAIRING")
        ) {
          let recoveryStatus: import("@prisma/client").AssetInstanceStatus = "AVAILABLE";
          if (ticket.fromHolderId) {
            recoveryStatus = "IN_USE";
          }
          // For repair, recover to IN_USE if the asset was previously held
          if (ticketType === "REPAIR" && ticket.fromHolderId) {
            recoveryStatus = "IN_USE";
          }
          // For return, recover to IN_USE if held
          if (ticketType === "RETURN" && ticket.fromHolderId) {
            recoveryStatus = "IN_USE";
          }

          const transition = await AssetStateMachine.transition(
            tx,
            ticket.targetAsset.id,
            recoveryStatus,
            { operatorId: user.userId },
          );

          // Set holder back if recovering to IN_USE
          if (recoveryStatus === "IN_USE" && ticket.fromHolderId) {
            await tx.assetInstance.update({
              where: { id: ticket.targetAsset.id },
              data: { holderId: ticket.fromHolderId },
            });
          }

          assetChanges.push(transition.after);
          await logAssetStatusChange(tx, {
            assetId: ticket.targetAsset.id,
            operatorId: user.userId,
            fromStatus: assetStatus,
            toStatus: recoveryStatus,
            metadata: { ticketId: id, reason: "cancelled" },
          });
        } else if (ticketType === "TRANSFER" && assetStatus === "TRANSFERRING") {
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
            fromStatus: "TRANSFERRING",
            toStatus: "IN_USE",
            metadata: { ticketId: id, reason: "cancelled" },
          });
        }
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await logTicketStatusChange(tx, {
        ticketId: id,
        operatorId: user.userId,
        fromStatus: currentStatus,
        toStatus: "CANCELLED",
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
