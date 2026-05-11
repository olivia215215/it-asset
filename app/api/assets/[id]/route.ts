import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError } from "@/lib/auth";
import { sanitizeAssetInstance } from "@/lib/dto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await verifyAuth(request);
    const { id } = await params;

    const asset = await prisma.assetInstance.findUnique({
      where: { id },
      include: { model: true, holder: true, department: true },
    });

    if (!asset) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }

    // Access control
    const isHolder = asset.holderId === user.userId;
    const isItAdmin = user.role === "IT_ADMIN";
    let isManagerInDept = false;

    if (user.role === "MANAGER" && asset.deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: user.deptId },
      });
      if (dept && dept.managerId === user.userId && asset.deptId === user.deptId) {
        isManagerInDept = true;
      }
    }

    if (!isHolder && !isItAdmin && !isManagerInDept) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json(
      sanitizeAssetInstance(
        asset as any,
        user.role as "EMPLOYEE" | "MANAGER" | "IT_ADMIN" | "EXECUTIVE",
      ),
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
