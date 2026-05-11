import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, AuthError, requireOneOf } from "@/lib/auth";
import { AssetStateMachine, TransitionError } from "@/lib/asset-state-machine";
import { logAssetStatusChange } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    requireOneOf(user, "IT_ADMIN");

    const body = await request.json();
    const { id, sn, modelId, purchaseDate, warrantyExpiry, deptId } = body;

    if (!id || !sn || !modelId || !purchaseDate) {
      return Response.json(
        { error: "id, sn, modelId, and purchaseDate are required" },
        { status: 400 },
      );
    }

    // Check unique constraints
    const existingId = await prisma.assetInstance.findUnique({ where: { id } });
    if (existingId) {
      return Response.json({ error: "Asset with this ID already exists" }, { status: 409 });
    }

    const existingSn = await prisma.assetInstance.findUnique({ where: { sn } });
    if (existingSn) {
      return Response.json(
        { error: "Asset with this serial number already exists" },
        { status: 409 },
      );
    }

    // Verify model exists
    const model = await prisma.assetModel.findUnique({ where: { id: modelId } });
    if (!model) {
      return Response.json({ error: "Asset model not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.assetInstance.create({
        data: {
          id,
          sn,
          modelId,
          status: "IN_STOCK",
          deptId: deptId ?? null,
          purchaseDate: new Date(purchaseDate),
          warrantyExpiry: warrantyExpiry
            ? new Date(warrantyExpiry)
            : new Date(
                new Date(purchaseDate).getTime() +
                  model.warrantyMonths * 30 * 24 * 60 * 60 * 1000,
              ),
        },
      });

      await logAssetStatusChange(tx, {
        assetId: asset.id,
        operatorId: user.userId,
        fromStatus: "NONE",
        toStatus: "IN_STOCK",
        metadata: { action: "inbound", sn, modelId },
      });

      return asset;
    });

    return Response.json(result, { status: 201 });
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
