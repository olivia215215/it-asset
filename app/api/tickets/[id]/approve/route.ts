import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { TicketWorkflow, WorkflowError } from "@/lib/ticket-workflow";
import { logTicketStatusChange } from "@/lib/audit";
import { notifyApprovalResult, notifyApprovalRequest } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "MANAGER", "IT_ADMIN");

    const { id } = await params;
    const body = await request.json();
    const { deputy } = body;

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        include: { applicant: true },
      });
      if (!ticket) {
        throw new WorkflowError("Ticket not found");
      }

      const currentStatus = ticket.status as import("@prisma/client").TicketStatus;

      // Determine who can approve at this stage
      if (currentStatus === "PENDING_MANAGER_1" || currentStatus === "PENDING_MANAGER_2") {
        const isIT = user.role === "IT_ADMIN";
        const isManager = user.role === "MANAGER";

        if (isManager && !isIT) {
          // MANAGER must be in the same department as applicant
          const applicant = await tx.user.findUnique({
            where: { id: ticket.applicantId },
          });
          if (!applicant || applicant.deptId !== user.deptId) {
            throw new WorkflowError("You can only approve tickets for your own department");
          }
        }

        if (isIT && deputy !== true) {
          throw new WorkflowError("IT_ADMIN can only approve as deputy (deputy: true)");
        }
      } else if (currentStatus === "PENDING_IT") {
        if (user.role !== "IT_ADMIN") {
          throw new WorkflowError("Only IT_ADMIN can approve at this stage");
        }
      } else {
        throw new WorkflowError(`Ticket cannot be approved in ${currentStatus} status`);
      }

      const nextStatus = TicketWorkflow.nextOnApprove(
        ticket.type as import("@prisma/client").TicketType,
        currentStatus,
      );
      if (!nextStatus) {
        throw new WorkflowError("No valid approval target for this status");
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(deputy ? { deputyApproval: true, deputyApproverId: user.userId } : {}),
        },
      });

      await logTicketStatusChange(tx, {
        ticketId: id,
        operatorId: user.userId,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        metadata: { deputy: !!deputy },
      });

      // Notify applicant
      await notifyApprovalResult(tx, {
        applicantId: ticket.applicantId,
        ticketId: id,
        approved: true,
        ticketType: ticket.type,
      });

      // If moving to PENDING_IT after manager approval, notify IT (no specific notification needed here)

      // If moving to PENDING_MANAGER_2 (transfer), notify the next manager
      if (nextStatus === "PENDING_MANAGER_2") {
        const dept = await tx.department.findUnique({
          where: { id: user.deptId },
          include: { manager: true },
        });
        if (dept?.manager) {
          await notifyApprovalRequest(tx, {
            managerId: dept.manager.id,
            ticketId: id,
            applicantName: "",
            ticketType: ticket.type,
          });
        }
      }

      return updated;
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
