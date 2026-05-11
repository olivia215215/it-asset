import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
import { logAssetStatusChange, logTicketStatusChange } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "IT_ADMIN");

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
      if (currentStatus !== "IN_PROGRESS") {
        throw new WorkflowError(
          `Ticket must be IN_PROGRESS to confirm, current: ${currentStatus}`,
        );
      }

      const applyResult = await TicketWorkflow.applyTransition(
        tx,
        id,
        "COMPLETED",
        { operatorId: user.userId },
      );

      await logTicketStatusChange(tx, {
        ticketId: id,
        operatorId: user.userId,
        fromStatus: currentStatus,
        toStatus: "COMPLETED",
      });

      // Log asset changes from workflow
      for (const assetChange of applyResult.assetChanges) {
        const assetRecord = assetChange as Record<string, unknown>;
        await logAssetStatusChange(tx, {
          assetId: assetRecord.id as string,
          operatorId: user.userId,
          fromStatus: ticket.targetAsset?.status ?? "",
          toStatus: assetRecord.status as string,
          metadata: { ticketId: id, action: "confirm_completion" },
        });
      }

      return applyResult.ticket;
    });

    return Response.json(result);
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
