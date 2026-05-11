import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
import { AssetStateMachine, TransitionError } from "@/lib/asset-state-machine";
import { logAssetStatusChange, logTicketStatusChange } from "@/lib/audit";
import { notifyApprovalRequest } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "IT_ADMIN");

    const body = await request.json();
    const { assetId, fromHolderId, toHolderId, targetDeptId, reason } = body;

    if (!assetId || !toHolderId || !reason) {
      return Response.json(
        { error: "assetId, toHolderId, and reason are required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.assetInstance.findUnique({
        where: { id: assetId },
        include: { model: true },
      });
      if (!asset) {
        throw new WorkflowError("Asset not found");
      }
      if (asset.status !== "IN_USE") {
        throw new TransitionError(
          `Asset must be IN_USE to transfer, current status: ${asset.status}`,
        );
      }

      const initialStatus = TicketWorkflow.determineInitialStatus("TRANSFER", {
        isManager: false,
        hasFromHolder: !!fromHolderId,
      });

      const ticket = await tx.ticket.create({
        data: {
          type: "TRANSFER",
          status: initialStatus,
          applicantId: user.userId,
          targetAssetId: assetId,
          fromHolderId: fromHolderId ?? null,
          toHolderId,
          targetDeptId: targetDeptId ?? null,
          reason,
        },
      });

      // Asset -> TRANSFERRING
      const transitionResult = await AssetStateMachine.transition(
        tx,
        assetId,
        "TRANSFERRING",
        { operatorId: user.userId },
      );

      await logAssetStatusChange(tx, {
        assetId,
        operatorId: user.userId,
        fromStatus: transitionResult.before.status as string,
        toStatus: "TRANSFERRING",
        metadata: { ticketId: ticket.id, toHolderId, fromHolderId },
      });

      await logTicketStatusChange(tx, {
        ticketId: ticket.id,
        operatorId: user.userId,
        fromStatus: "SUBMITTED",
        toStatus: initialStatus,
      });

      // Notify department managers if needed
      if (initialStatus === "PENDING_MANAGER_1" && fromHolderId) {
        const fromHolder = await tx.user.findUnique({
          where: { id: fromHolderId },
        });
        if (fromHolder) {
          const dept = await tx.department.findUnique({
            where: { id: fromHolder.deptId },
            include: { manager: true },
          });
          if (dept?.manager) {
            await notifyApprovalRequest(tx, {
              managerId: dept.manager.id,
              ticketId: ticket.id,
              applicantName: "",
              ticketType: "TRANSFER",
            });
          }
        }
      }

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
