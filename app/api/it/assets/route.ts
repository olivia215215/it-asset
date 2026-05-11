import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "IT_ADMIN");

    const url = request.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)),
    );
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const sn = url.searchParams.get("sn");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.model = { category };
    if (sn) where.sn = { contains: sn, mode: "insensitive" };

    const [assets, total] = await Promise.all([
      prisma.assetInstance.findMany({
        where: where as any,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { model: true, holder: { select: { id: true, name: true } } },
      }),
      prisma.assetInstance.count({ where: where as any }),
    ]);

    return Response.json({
      data: assets,
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
