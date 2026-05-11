import { TicketType, TicketStatus, AssetInstanceStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

// Allowed transitions indexed by (ticketType, fromStatus)
const transitionsByTypeAndStatus: Record<
  string,
  Record<string, TicketStatus[]>
> = {
  APPLY: {
    SUBMITTED: ["PENDING_MANAGER_1", "PENDING_IT"],
    PENDING_MANAGER_1: ["PENDING_IT", "REJECTED", "CANCELLED"],
    PENDING_IT: ["APPROVED", "IN_PROGRESS", "REJECTED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "REJECTED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
    COMPLETED: [],
  },
  RETURN: {
    SUBMITTED: ["PENDING_IT"],
    PENDING_IT: ["APPROVED", "IN_PROGRESS", "REJECTED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "REJECTED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
    COMPLETED: [],
  },
  REPAIR: {
    SUBMITTED: ["PENDING_IT"],
    PENDING_IT: ["APPROVED", "IN_PROGRESS", "REJECTED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "REJECTED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
    COMPLETED: [],
  },
  TRANSFER: {
    SUBMITTED: ["PENDING_MANAGER_1", "PENDING_MANAGER_2"],
    PENDING_MANAGER_1: ["PENDING_MANAGER_2", "REJECTED", "CANCELLED"],
    PENDING_MANAGER_2: ["PENDING_IT", "REJECTED", "CANCELLED"],
    PENDING_IT: ["APPROVED", "IN_PROGRESS", "REJECTED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "REJECTED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
    COMPLETED: [],
  },
};

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class TicketWorkflow {
  static allowed = new Map<
    TicketType,
    Map<TicketStatus, TicketStatus[]>
  >();

  private static ensureAllowed(): void {
    if (TicketWorkflow.allowed.size === 0) {
      for (const [type, transitions] of Object.entries(
        transitionsByTypeAndStatus,
      )) {
        const inner = new Map<TicketStatus, TicketStatus[]>();
        for (const [from, toList] of Object.entries(transitions)) {
          inner.set(from as TicketStatus, toList as TicketStatus[]);
        }
        TicketWorkflow.allowed.set(type as TicketType, inner);
      }
    }
  }

  static canTransition(
    type: TicketType,
    from: TicketStatus,
    to: TicketStatus,
  ): boolean {
    TicketWorkflow.ensureAllowed();
    const byType = transitionsByTypeAndStatus[type];
    if (!byType) return false;
    const allowed = byType[from];
    return allowed?.includes(to) ?? false;
  }

  /**
   * Determine the next status when a ticket is approved.
   */
  static nextOnApprove(
    type: TicketType,
    currentStatus: TicketStatus,
  ): TicketStatus | null {
    if (type === "TRANSFER" && currentStatus === "PENDING_MANAGER_1") {
      return "PENDING_MANAGER_2";
    }
    if (
      currentStatus === "PENDING_MANAGER_1" ||
      currentStatus === "PENDING_MANAGER_2"
    ) {
      return "PENDING_IT";
    }
    if (currentStatus === "PENDING_IT") {
      return "APPROVED";
    }
    return null;
  }

  /**
   * Determine the initial status for a newly submitted ticket.
   */
  static determineInitialStatus(
    type: TicketType,
    context: {
      isManager: boolean;
      purchasePrice?: number;
      hasFromHolder?: boolean;
    },
  ): TicketStatus {
    switch (type) {
      case "APPLY": {
        // Purchase price < 1000: skip manager, direct PENDING_IT
        if (context.purchasePrice !== undefined && context.purchasePrice < 1000) {
          return "PENDING_IT";
        }
        // MANAGER applying for themselves: PENDING_IT
        if (context.isManager) {
          return "PENDING_IT";
        }
        return "PENDING_MANAGER_1";
      }
      case "RETURN":
      case "REPAIR":
        return "PENDING_IT";
      case "TRANSFER":
        // No fromHolderId: skip PENDING_MANAGER_1
        if (!context.hasFromHolder) {
          return "PENDING_MANAGER_2";
        }
        return "PENDING_MANAGER_1";
      default:
        return "PENDING_IT";
    }
  }

  /**
   * Same as nextOnApprove — returns the target status when approved.
   */
  static getApproveTarget(
    type: TicketType,
    currentStatus: TicketStatus,
  ): TicketStatus | null {
    return TicketWorkflow.nextOnApprove(type, currentStatus);
  }

  static async applyTransition(
    tx: Prisma.TransactionClient,
    ticketId: string,
    toStatus: TicketStatus,
    context: {
      operatorId: string;
      rejectReason?: string;
      deputy?: boolean;
      deputyApproverId?: string;
      repairOutcome?: "return_holder" | "make_available" | "scrap";
      assetStatusOnComplete?: AssetInstanceStatus;
      completedAt?: Date;
    },
  ): Promise<{
    ticket: Record<string, unknown>;
    beforeStatus: TicketStatus;
    afterStatus: TicketStatus;
    assetChanges: Record<string, unknown>[];
  }> {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new WorkflowError("Ticket not found");
    }

    const beforeStatus = ticket.status as TicketStatus;

    if (
      toStatus !== "REJECTED" &&
      toStatus !== "CANCELLED" &&
      !TicketWorkflow.canTransition(
        ticket.type as TicketType,
        beforeStatus,
        toStatus,
      )
    ) {
      throw new WorkflowError(
        `Cannot transition ${ticket.type} ticket from ${beforeStatus} to ${toStatus}`,
      );
    }

    // Allow REJECTED/CANCELLED from any non-terminal status
    if (
      (toStatus === "REJECTED" || toStatus === "CANCELLED") &&
      ["COMPLETED", "REJECTED", "CANCELLED"].includes(beforeStatus)
    ) {
      throw new WorkflowError(
        `Cannot ${toStatus.toLowerCase()} a ticket in ${beforeStatus} status`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    const assetChanges: Record<string, unknown>[] = [];

    if (toStatus === "REJECTED" && context.rejectReason) {
      updateData.rejectReason = context.rejectReason;
    }

    if (toStatus === "COMPLETED") {
      updateData.completedAt = context.completedAt ?? new Date();
    }

    if (context.deputy && context.deputyApproverId) {
      updateData.deputyApproval = true;
      updateData.deputyApproverId = context.deputyApproverId;
    }

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: updateData as Prisma.TicketUpdateInput,
      include: {
        targetAsset: true,
      },
    });

    // Handle asset changes on COMPLETED
    if (toStatus === "COMPLETED" && updated.targetAsset) {
      if (ticket.type === "APPLY") {
        const updatedAsset = await tx.assetInstance.update({
          where: { id: updated.targetAsset.id },
          data: {
            status: "IN_USE",
            holderId: ticket.applicantId,
          },
        });
        assetChanges.push(
          updatedAsset as unknown as Record<string, unknown>,
        );
      } else if (ticket.type === "RETURN") {
        const updatedAsset = await tx.assetInstance.update({
          where: { id: updated.targetAsset.id },
          data: {
            status: "AVAILABLE",
            holderId: null,
          },
        });
        assetChanges.push(
          updatedAsset as unknown as Record<string, unknown>,
        );
      } else if (ticket.type === "TRANSFER") {
        const updatedAsset = await tx.assetInstance.update({
          where: { id: updated.targetAsset.id },
          data: {
            status: "IN_USE",
            holderId: ticket.toHolderId,
            deptId: ticket.targetDeptId ?? undefined,
          },
        });
        assetChanges.push(
          updatedAsset as unknown as Record<string, unknown>,
        );
      } else if (ticket.type === "REPAIR") {
        // Repair completion outcome is handled by complete route context
        if (context.repairOutcome) {
          let assetUpdate: Record<string, unknown> = {
            status: "IN_USE",
          };
          if (context.repairOutcome === "make_available") {
            assetUpdate = {
              status: "AVAILABLE",
              holderId: null,
            };
          } else if (context.repairOutcome === "scrap") {
            assetUpdate = {
              status: "SCRAPPED",
              holderId: null,
            };
          }
          const updatedAsset = await tx.assetInstance.update({
            where: { id: updated.targetAsset.id },
            data: assetUpdate as Prisma.AssetInstanceUpdateInput,
          });
          assetChanges.push(
            updatedAsset as unknown as Record<string, unknown>,
          );
        }
      }
    }

    return {
      ticket: updated as unknown as Record<string, unknown>,
      beforeStatus,
      afterStatus: toStatus,
      assetChanges,
    };
  }
}
