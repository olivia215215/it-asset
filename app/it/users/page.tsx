"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface DepartmentGroup {
  name: string;
  users: UserInfo[];
}

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "员工",
  MANAGER: "主管",
  IT_ADMIN: "IT 管理员",
  EXECUTIVE: "高管",
};

export default function ItUsersPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "IT_ADMIN") return;
    // Static demo data
    setDepartments([
      {
        name: "技术部",
        users: [
          { name: "张明", email: "zhangming@example.com", role: "EMPLOYEE" },
          { name: "李华", email: "lihua@example.com", role: "MANAGER" },
        ],
      },
      {
        name: "人事部",
        users: [
          { name: "王芳", email: "wangfang@example.com", role: "EMPLOYEE" },
        ],
      },
      {
        name: "财务部",
        users: [
          { name: "赵强", email: "zhaoqiang@example.com", role: "EMPLOYEE" },
        ],
      },
    ]);
    setLoading(false);
  }, []);

  if (!user) return null;
  if (user.role !== "IT_ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅 IT 管理员可访问此页面</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold">用户管理</h1>

      {departments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无用户数据</p>
        </div>
      ) : (
        <div className="space-y-6">
          {departments.map((dept) => (
            <div key={dept.name} className="space-y-2">
              <h2 className="text-lg font-semibold">{dept.name}</h2>
              <div className="space-y-2">
                {dept.users.map((u) => (
                  <div key={u.email} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
