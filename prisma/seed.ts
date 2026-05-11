import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

export async function runSeed(prisma: PrismaClient) {
  const password = await bcrypt.hash("password", 10);

  // ── 1. Departments (no managerId yet) ──────────────────────────────────
  await prisma.department.createMany({
    data: [
      { id: "dept-01", name: "研发部" },
      { id: "dept-02", name: "产品部" },
      { id: "dept-03", name: "运营部" },
    ],
    skipDuplicates: true,
  });

  // ── 2. Users ───────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      {
        id: "user-employee-1",
        email: "employee1@itasset.local",
        passwordHash: password,
        name: "员工一",
        role: "EMPLOYEE",
        deptId: "dept-01",
        status: "ACTIVE",
      },
      {
        id: "user-employee-2",
        email: "employee2@itasset.local",
        passwordHash: password,
        name: "员工二",
        role: "EMPLOYEE",
        deptId: "dept-02",
        status: "ACTIVE",
      },
      {
        id: "user-manager-1",
        email: "manager1@itasset.local",
        passwordHash: password,
        name: "经理一",
        role: "MANAGER",
        deptId: "dept-01",
        status: "ACTIVE",
      },
      {
        id: "user-manager-2",
        email: "manager2@itasset.local",
        passwordHash: password,
        name: "经理二",
        role: "MANAGER",
        deptId: "dept-02",
        status: "ACTIVE",
      },
      {
        id: "user-admin",
        email: "admin@itasset.local",
        passwordHash: password,
        name: "管理员",
        role: "IT_ADMIN",
        deptId: "dept-01",
        status: "ACTIVE",
      },
      {
        id: "user-exec",
        email: "exec@itasset.local",
        passwordHash: password,
        name: "高管",
        role: "EXECUTIVE",
        deptId: "dept-03",
        status: "ACTIVE",
      },
    ],
    skipDuplicates: true,
  });

  // ── 3. Update departments with managerId ──────────────────────────────
  await prisma.department.update({
    where: { id: "dept-01" },
    data: { managerId: "user-manager-1" },
  });
  await prisma.department.update({
    where: { id: "dept-02" },
    data: { managerId: "user-manager-2" },
  });

  // ── 4. Asset Models ───────────────────────────────────────────────────
  await prisma.assetModel.createMany({
    data: [
      {
        id: "MODEL-L01",
        category: "LAPTOP",
        brandName: "Apple",
        modelName: 'MacBook Pro 14"',
        specs: { cpu: "M4 Pro", ram: "48GB", storage: "1TB" },
        purchasePrice: 19999.0,
        supplier: "Apple Inc.",
        warrantyMonths: 12,
        status: "ACTIVE",
      },
      {
        id: "MODEL-M01",
        category: "MONITOR",
        brandName: "Dell",
        modelName: "U2724D",
        specs: { resolution: "2560x1440", size: '27"' },
        purchasePrice: 3299.0,
        supplier: "Dell Technologies",
        warrantyMonths: 36,
        status: "ACTIVE",
      },
      {
        id: "MODEL-P01",
        category: "KEYBOARD",
        brandName: "Logitech",
        modelName: "MX Mechanical",
        specs: { layout: "full-size", switch: "tactile" },
        purchasePrice: 1099.0,
        supplier: "Logitech",
        warrantyMonths: 12,
        status: "ACTIVE",
      },
    ],
    skipDuplicates: true,
  });

  // ── 5. Asset Instances (9 statuses + 1 duplicate IN_USE) ──────────────
  await prisma.assetInstance.createMany({
    data: [
      {
        id: "AST-101",
        sn: "SN-AST-101",
        modelId: "MODEL-L01",
        status: "IN_STOCK",
        purchaseDate: new Date("2025-01-15"),
        warrantyExpiry: new Date("2026-01-15"),
      },
      {
        id: "AST-102",
        sn: "SN-AST-102",
        modelId: "MODEL-M01",
        status: "AVAILABLE",
        purchaseDate: new Date("2025-03-01"),
        warrantyExpiry: new Date("2028-03-01"),
      },
      {
        id: "AST-103",
        sn: "SN-AST-103",
        modelId: "MODEL-L01",
        status: "ASSIGNED",
        holderId: "user-employee-1",
        deptId: "dept-01",
        purchaseDate: new Date("2025-02-01"),
        warrantyExpiry: new Date("2026-02-01"),
      },
      {
        id: "AST-104",
        sn: "SN-AST-104",
        modelId: "MODEL-L01",
        status: "IN_USE",
        holderId: "user-employee-2",
        deptId: "dept-02",
        purchaseDate: new Date("2025-02-15"),
        warrantyExpiry: new Date("2026-02-15"),
      },
      {
        id: "AST-105",
        sn: "SN-AST-105",
        modelId: "MODEL-M01",
        status: "RETURNING",
        holderId: "user-employee-1",
        deptId: "dept-01",
        purchaseDate: new Date("2025-04-01"),
        warrantyExpiry: new Date("2028-04-01"),
      },
      {
        id: "AST-106",
        sn: "SN-AST-106",
        modelId: "MODEL-M01",
        status: "REPAIRING",
        purchaseDate: new Date("2025-03-15"),
        warrantyExpiry: new Date("2028-03-15"),
      },
      {
        id: "AST-107",
        sn: "SN-AST-107",
        modelId: "MODEL-P01",
        status: "TRANSFERRING",
        holderId: "user-manager-1",
        deptId: "dept-01",
        purchaseDate: new Date("2025-05-01"),
        warrantyExpiry: new Date("2026-05-01"),
      },
      {
        id: "AST-108",
        sn: "SN-AST-108",
        modelId: "MODEL-P01",
        status: "LOST",
        holderId: "user-employee-1",
        lostReason: "Reported lost during inventory",
        purchaseDate: new Date("2025-01-20"),
        warrantyExpiry: new Date("2026-01-20"),
      },
      {
        id: "AST-109",
        sn: "SN-AST-109",
        modelId: "MODEL-M01",
        status: "SCRAPPED",
        scrapReason: "Irreparable hardware failure",
        purchaseDate: new Date("2024-06-01"),
        warrantyExpiry: new Date("2027-06-01"),
      },
      {
        id: "AST-110",
        sn: "SN-AST-110",
        modelId: "MODEL-P01",
        status: "IN_USE",
        holderId: "user-manager-2",
        deptId: "dept-02",
        purchaseDate: new Date("2025-05-10"),
        warrantyExpiry: new Date("2026-05-10"),
      },
    ],
    skipDuplicates: true,
  });

  // ── 6. Tickets ────────────────────────────────────────────────────────
  await prisma.ticket.createMany({
    data: [
      {
        id: "ticket-apply-1",
        type: "APPLY",
        status: "APPROVED",
        applicantId: "user-employee-1",
        targetModelId: "MODEL-L01",
        reason: "Need a new laptop for development work",
      },
      {
        id: "ticket-apply-2",
        type: "APPLY",
        status: "SUBMITTED",
        applicantId: "user-employee-2",
        targetModelId: "MODEL-P01",
        reason: "Requesting mechanical keyboard for office use",
      },
      {
        id: "ticket-repair-1",
        type: "REPAIR",
        status: "IN_PROGRESS",
        applicantId: "user-employee-1",
        targetAssetId: "AST-106",
        reason: "Monitor screen flickering intermittently",
      },
      {
        id: "ticket-transfer-1",
        type: "TRANSFER",
        status: "SUBMITTED",
        applicantId: "user-manager-1",
        targetAssetId: "AST-103",
        fromHolderId: "user-employee-1",
        toHolderId: "user-employee-2",
        reason: "Reallocation of assets between teams",
      },
    ],
    skipDuplicates: true,
  });

  // ── 7. Notifications ──────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        id: "notif-1",
        userId: "user-employee-1",
        type: "APPROVAL_RESULT",
        title: "申请已通过",
        body: "您的 MacBook Pro 申请已获批准，请前往 IT 部门领取。",
        relatedTicketId: "ticket-apply-1",
      },
      {
        id: "notif-2",
        userId: "user-employee-2",
        type: "PICKUP_READY",
        title: "设备待领取",
        body: "您申请的 MX Mechanical 键盘已到货，可以领取了。",
        relatedAssetId: "AST-110",
      },
      {
        id: "notif-3",
        userId: "user-manager-1",
        type: "REPAIR_UPDATE",
        title: "维修进度更新",
        body: "显示器 AST-106 维修中，预计 3 个工作日内完成。",
        relatedTicketId: "ticket-repair-1",
        relatedAssetId: "AST-106",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed successfully.");
}

// ── CLI entry point ──────────────────────────────────────────────────────
async function main() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
