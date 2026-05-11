import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "MANAGER", "IT_ADMIN");

    const url = request.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)),
    );

    let where: Record<string, unknown>;

    if (user.role === "IT_ADMIN") {
      // IT_ADMIN sees all PENDING_IT tickets
      where = { status: "PENDING_IT" };
    } else {
      // MANAGER sees tickets from their department that need manager approval
      where = {
        status: { in: ["PENDING_MANAGER_1"] },
        applicant: { deptId: user.deptId },
      };
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          applicant: { select: { id: true, name: true, email: true, deptId: true } },
          targetAsset: { include: { model: true } },
          targetModel: true,
        },
      }),
      prisma.ticket.count({ where: where as any }),
    ]);

    return Response.json({
      data: tickets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
