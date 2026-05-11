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
    requireOneOf(user, "IT_ADMIN");

    const { id } = await params;
    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return Response.json({ error: "assetId is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { applicant: true },
      });
      if (!ticket) {
        throw new WorkflowError("Ticket not found");
      }

      const currentStatus = ticket.status as import("@prisma/client").TicketStatus;
      if (currentStatus !== "APPROVED") {
        throw new WorkflowError(
          `Ticket must be APPROVED before assigning, current: ${currentStatus}`,
        );
      }

      // Assign the specified asset to the ticket
      const transition = await AssetStateMachine.transition(
        tx,
        assetId,
        "ASSIGNED",
        { operatorId: user.userId },
      );

      await logAssetStatusChange(tx, {
        assetId,
        operatorId: user.userId,
        fromStatus: transition.before.status as string,
        toStatus: "ASSIGNED",
        metadata: { ticketId: id, applicantId: ticket.applicantId },
      });

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          targetAssetId: assetId,
          assignedById: user.userId,
        },
      });

      await logTicketStatusChange(tx, {
        ticketId: id,
        operatorId: user.userId,
        fromStatus: currentStatus,
        toStatus: "IN_PROGRESS",
        metadata: { assignedAssetId: assetId },
      });

      return { ticket: updated, asset: transition.after };
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
