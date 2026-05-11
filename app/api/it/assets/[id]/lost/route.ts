import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { AssetStateMachine, TransitionError } from "@/lib/asset-state-machine";
import { logAssetStatusChange } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "IT_ADMIN");

    const { id } = await params;
    const body = await request.json();
    const { lostReason } = body;

    if (!lostReason) {
      return Response.json({ error: "lostReason is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transition = await AssetStateMachine.transition(tx, id, "LOST", {
        operatorId: user.userId,
        lostReason,
      });

      await logAssetStatusChange(tx, {
        assetId: id,
        operatorId: user.userId,
        fromStatus: transition.before.status as string,
        toStatus: "LOST",
        metadata: {
          lostReason,
          cancelledTicketIds: transition.cancelledTicketIds,
        },
      });

      return transition;
    });

    return Response.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof TransitionError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
