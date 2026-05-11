import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, name: true, email: true, role: true, deptId: true } },
        targetAsset: { include: { model: true } },
        targetModel: true,
        assignedBy: { select: { id: true, name: true } },
        processor: { select: { id: true, name: true } },
        fromHolder: { select: { id: true, name: true } },
        toHolder: { select: { id: true, name: true } },
        targetDept: true,
        deputyApprover: { select: { id: true, name: true } },
        notifications: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isApplicant = ticket.applicantId === user.userId;
    const isItAdmin = user.role === "IT_ADMIN";

    // MANAGER can see tickets from their department
    const isManager = user.role === "MANAGER";
    let canView = isApplicant || isItAdmin;

    if (isManager && !canView) {
      const dept = await prisma.department.findUnique({
        where: { id: user.deptId },
      });
      if (dept && dept.managerId === user.userId) {
        const applicant = await prisma.user.findUnique({
          where: { id: ticket.applicantId },
          select: { deptId: true },
        });
        if (applicant && applicant.deptId === user.deptId) {
          canView = true;
        }
      }
    }

    if (!canView) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json(ticket);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
