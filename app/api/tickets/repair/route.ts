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
    const { assetId, reason, aiTriageResult, needRepair } = body;

    if (!assetId || !reason) {
      return Response.json(
        { error: "assetId and reason are required" },
        { status: 400 },
      );
    }

    if (needRepair === false) {
      return Response.json(
        { error: "Repair is not needed based on assessment" },
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
      if (!AssetStateMachine.canTransition(asset.status, "REPAIRING")) {
        throw new TransitionError(
          `Asset cannot be sent for repair from ${asset.status} status`,
        );
      }

      const initialStatus = TicketWorkflow.determineInitialStatus("REPAIR", {
        isManager: user.role === "MANAGER",
      });

      const ticket = await tx.ticket.create({
        data: {
          type: "REPAIR",
          status: initialStatus,
          applicantId: user.userId,
          targetAssetId: assetId,
          reason,
          aiTriageResult: aiTriageResult ?? null,
        },
      });

      // Asset -> REPAIRING
      const transitionResult = await AssetStateMachine.transition(
        tx,
        assetId,
        "REPAIRING",
        { operatorId: user.userId },
      );

      await logAssetStatusChange(tx, {
        assetId,
        operatorId: user.userId,
        fromStatus: transitionResult.before.status as string,
        toStatus: "REPAIRING",
        metadata: { ticketId: ticket.id, aiTriageResult },
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
