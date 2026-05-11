"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "员工",
  MANAGER: "主管",
  IT_ADMIN: "IT 管理员",
  EXECUTIVE: "高管",
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold">个人资料</h1>

      <div className="rounded-lg border p-6 space-y-6">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">角色</p>
            <p className="text-sm font-medium">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">部门</p>
            <p className="text-sm font-medium">{user.department}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">部门 ID</p>
            <p className="text-sm font-medium">{user.departmentId}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => router.push("/home")}>
          返回首页
        </Button>
        <Button variant="destructive" onClick={handleLogout}>
          退出登录
        </Button>
      </div>
    </div>
  );
}
