import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "IT_ADMIN");

    const { id } = await params;

    const asset = await prisma.assetInstance.findUnique({
      where: { id },
      include: {
        model: true,
        holder: { select: { id: true, name: true, email: true } },
        department: true,
        tickets: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            applicant: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!asset) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }

    return Response.json(asset);
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
