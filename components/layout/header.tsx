"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onMenuClick?: () => void;
}

const breadcrumbLabels: Record<string, string> = {
  home: "首页",
  "my-assets": "我的资产",
  apply: "申领设备",
  tickets: "我的工单",
  chat: "AI 助手",
  notifications: "通知中心",
  profile: "个人设置",
  approvals: "审批工作台",
  "dept-board": "部门看板",
  it: "IT 管理",
  assets: "资产管理",
  models: "型号管理",
  inbound: "入库操作",
  inventory: "盘点",
  users: "用户管理",
  audit: "审计日志",
  exec: "管理层",
  dashboard: "资产大屏",
  insights: "AI 洞察",
};

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let href = "";
  for (const segment of segments) {
    href += "/" + segment;
    crumbs.push({
      label: breadcrumbLabels[segment] || segment,
      href,
    });
  }

  return crumbs;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      {/* Left: Menu button + Breadcrumbs */}
      <div className="flex items-center gap-2">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          className="md:hidden"
          aria-label="打开菜单"
        >
          <Menu className="size-4" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.length > 0 ? (
            breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {index > 0 && (
                  <span className="text-muted-foreground/40 mx-0.5">/</span>
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))
          ) : (
            <span className="font-medium text-foreground">首页</span>
          )}
        </nav>
      </div>

      {/* Right: Notification Bell + User Avatar */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <Avatar size="sm">
              <AvatarFallback>
                {user.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserIcon className="size-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
