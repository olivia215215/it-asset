import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError } from "@/lib/auth";
import { sanitizeAssetInstance } from "@/lib/dto";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    const url = request.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)),
    );

    const where = { holderId: user.userId };

    const [assets, total] = await Promise.all([
      prisma.assetInstance.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { model: true },
      }),
      prisma.assetInstance.count({ where }),
    ]);

    const sanitized = assets.map((a) =>
      sanitizeAssetInstance(
        a as any,
        user.role as "EMPLOYEE" | "MANAGER" | "IT_ADMIN" | "EXECUTIVE",
      ),
    );

    return Response.json({
      data: sanitized,
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
