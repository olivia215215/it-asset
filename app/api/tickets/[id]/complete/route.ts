import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
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
    const { outcome } = body; // "return_holder" | "make_available" | "scrap"

    if (!outcome || !["return_holder", "make_available", "scrap"].includes(outcome)) {
      return Response.json(
        { error: "outcome must be one of: return_holder, make_available, scrap" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { targetAsset: { include: { model: true } } },
      });
      if (!ticket) {
        throw new WorkflowError("Ticket not found");
      }

      const currentStatus = ticket.status as import("@prisma/client").TicketStatus;
      if (currentStatus !== "IN_PROGRESS") {
        throw new WorkflowError(
          `Ticket must be IN_PROGRESS to complete, current: ${currentStatus}`,
        );
      }

      if (ticket.type !== "REPAIR") {
        throw new WorkflowError("Complete endpoint is only for REPAIR tickets");
      }

      if (!ticket.targetAsset) {
        throw new WorkflowError("Ticket has no target asset");
      }

      // Apply the repair outcome to the asset
      let assetTargetStatus: import("@prisma/client").AssetInstanceStatus = "IN_USE";
      let assetContext: Record<string, unknown> = { operatorId: user.userId };

      switch (outcome) {
        case "return_holder":
          assetTargetStatus = "IN_USE";
          break;
        case "make_available":
          assetTargetStatus = "AVAILABLE";
          break;
        case "scrap":
          assetTargetStatus = "SCRAPPED";
          if (body.scrapReason) {
            assetContext.scrapReason = body.scrapReason;
          }
          break;
      }

      const transition = await AssetStateMachine.transition(
        tx,
        ticket.targetAsset.id,
        assetTargetStatus,
        assetContext as any,
      );

      await logAssetStatusChange(tx, {
        assetId: ticket.targetAsset.id,
        operatorId: user.userId,
        fromStatus: "REPAIRING",
        toStatus: assetTargetStatus,
        metadata: { ticketId: id, outcome },
      });

      // Update ticket to COMPLETED
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          processorId: user.userId,
        },
      });

      await logTicketStatusChange(tx, {
        ticketId: id,
        operatorId: user.userId,
        fromStatus: currentStatus,
        toStatus: "COMPLETED",
        metadata: { outcome, assetStatus: assetTargetStatus },
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
