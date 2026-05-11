import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/prisma/seed";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Reset is not allowed in production" },
      { status: 403 },
    );
  }

  // Delete in FK-safe order: child tables first
  await prisma.notification.deleteMany();
  await prisma.inventoryScan.deleteMany();
  await prisma.inventorySession.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.assetInstance.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.assetModel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Re-seed
  await runSeed(prisma);

  return NextResponse.json({ message: "Database reset and re-seeded" });
}
