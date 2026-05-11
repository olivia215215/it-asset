import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const demoUsers: Record<string, {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  departmentId: string;
}> = {
  "demo-emp":  { id: "demo-emp",  name: "张三", email: "zhangsan@example.com",   role: "EMPLOYEE",  department: "技术部", departmentId: "dept-tech" },
  "demo-mgr":  { id: "demo-mgr",  name: "李四", email: "lisi@example.com",       role: "MANAGER",   department: "技术部", departmentId: "dept-tech" },
  "demo-it":   { id: "demo-it",   name: "王五", email: "wangwu@example.com",     role: "IT_ADMIN",  department: "IT 部", departmentId: "dept-it" },
  "demo-exec": { id: "demo-exec", name: "赵六", email: "zhaoliu@example.com",    role: "EXECUTIVE", department: "管理层", departmentId: "dept-mgmt" },
};

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);

    // Demo user: return hardcoded data without querying prisma
    if (authUser.userId.startsWith("demo-")) {
      const demoUser = demoUsers[authUser.userId];
      if (!demoUser) {
        return NextResponse.json(
          { error: "Demo user not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ user: demoUser });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { department: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department.name,
        departmentId: user.deptId,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
