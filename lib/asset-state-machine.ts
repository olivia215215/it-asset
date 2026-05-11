import { AssetInstanceStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const allowedTransitionsMap: Record<AssetInstanceStatus, AssetInstanceStatus[]> = {
  IN_STOCK: ["AVAILABLE"],
  AVAILABLE: ["ASSIGNED", "LOST"],
  ASSIGNED: ["IN_USE", "AVAILABLE", "LOST"],
  IN_USE: ["RETURNING", "REPAIRING", "TRANSFERRING", "LOST"],
  RETURNING: ["AVAILABLE", "SCRAPPED"],
  REPAIRING: ["IN_USE", "AVAILABLE", "SCRAPPED"],
  TRANSFERRING: ["IN_USE"],
  LOST: [],
  SCRAPPED: [],
};

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

export class AssetStateMachine {
  static allowedTransitions = new Map(
    Object.entries(allowedTransitionsMap),
  ) as Map<AssetInstanceStatus, AssetInstanceStatus[]>;

  static canTransition(
    from: AssetInstanceStatus,
    to: AssetInstanceStatus,
  ): boolean {
    const allowed = allowedTransitionsMap[from];
    return allowed?.includes(to) ?? false;
  }

  static async transition(
    tx: Prisma.TransactionClient,
    assetId: string,
    to: AssetInstanceStatus,
    context: {
      operatorId: string;
      lostReason?: string;
      scrapReason?: string;
    },
  ): Promise<{
    asset: Record<string, unknown>;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    cancelledTicketIds: string[];
  }> {
    const asset = await tx.assetInstance.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new TransitionError("Asset not found");
    }

    const from = asset.status;

    if (!AssetStateMachine.canTransition(from, to)) {
      throw new TransitionError(
        `Cannot transition asset from ${from} to ${to}`,
      );
    }

    const before = { ...asset };
    let cancelledTicketIds: string[] = [];

    if (to === "LOST") {
      const activeTickets = await tx.ticket.findMany({
        where: {
          targetAssetId: assetId,
          status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
        },
      });
      cancelledTicketIds = activeTickets.map((t) => t.id);
      if (cancelledTicketIds.length > 0) {
        await tx.ticket.updateMany({
          where: { id: { in: cancelledTicketIds } },
          data: { status: "CANCELLED" },
        });
      }
    }

    const updateData: Record<string, unknown> = { status: to };

    if (to === "LOST" && context.lostReason) {
      updateData.lostReason = context.lostReason;
    }
    if (to === "SCRAPPED") {
      if (context.scrapReason) {
        updateData.scrapReason = context.scrapReason;
      }
      updateData.holderId = null;
    }
    if (to === "AVAILABLE") {
      updateData.holderId = null;
    }

    const updated = await tx.assetInstance.update({
      where: { id: assetId },
      data: updateData as Prisma.AssetInstanceUpdateInput,
    });

    return {
      asset: updated as unknown as Record<string, unknown>,
      before,
      after: updated as unknown as Record<string, unknown>,
      cancelledTicketIds,
    };
  }
}
