import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
import { AssetStateMachine, TransitionError } from "@/lib/asset-state-machine";
import { logAssetStatusChange, logTicketStatusChange } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "EMPLOYEE", "MANAGER");

    const body = await request.json();
    const { assetId, reason } = body;

    if (!assetId || !reason) {
      return Response.json(
        { error: "assetId and reason are required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.assetInstance.findUnique({
        where: { id: assetId },
      });
      if (!asset) {
        throw new WorkflowError("Asset not found");
      }
      if (asset.holderId !== user.userId) {
        throw new WorkflowError("You are not the holder of this asset");
      }
      if (!AssetStateMachine.canTransition(asset.status, "RETURNING")) {
        throw new TransitionError(
          `Asset cannot be returned from ${asset.status} status`,
        );
      }

      // Check for existing non-terminal return ticket
      const existingReturn = await tx.ticket.findFirst({
        where: {
          type: "RETURN",
          targetAssetId: assetId,
          applicantId: user.userId,
          status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
        },
      });
      if (existingReturn) {
        throw new WorkflowError("A return request already exists for this asset");
      }

      const initialStatus = TicketWorkflow.determineInitialStatus("RETURN", {
        isManager: user.role === "MANAGER",
      });

      const ticket = await tx.ticket.create({
        data: {
          type: "RETURN",
          status: initialStatus,
          applicantId: user.userId,
          targetAssetId: assetId,
          reason,
        },
      });

      // Asset -> RETURNING
      const transitionResult = await AssetStateMachine.transition(
        tx,
        assetId,
        "RETURNING",
        { operatorId: user.userId },
      );

      await logAssetStatusChange(tx, {
        assetId,
        operatorId: user.userId,
        fromStatus: transitionResult.before.status as string,
        toStatus: "RETURNING",
        metadata: { ticketId: ticket.id },
      });

      await logTicketStatusChange(tx, {
        ticketId: ticket.id,
        operatorId: user.userId,
        fromStatus: "SUBMITTED",
        toStatus: initialStatus,
      });

      return { ticket, asset: transitionResult.after };
    });

    return Response.json(result, { status: 201 });
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
