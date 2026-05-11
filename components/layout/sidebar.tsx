"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth, type UserRole } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Laptop,
  ClipboardPlus,
  Ticket,
  Bot,
  Bell,
  Settings,
  CheckSquare,
  BarChart3,
  Wrench,
  Package,
  Archive,
  Boxes,
  ClipboardList,
  Users,
  FileText,
  PieChart,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  { label: "首页", href: "/home", icon: LayoutDashboard, roles: ["EMPLOYEE", "MANAGER", "IT_ADMIN", "EXECUTIVE"] },
  { label: "我的资产", href: "/my-assets", icon: Laptop, roles: ["EMPLOYEE", "MANAGER"] },
  { label: "申领设备", href: "/apply", icon: ClipboardPlus, roles: ["EMPLOYEE", "MANAGER"] },
  { label: "我的工单", href: "/tickets", icon: Ticket, roles: ["EMPLOYEE", "MANAGER"] },
  { label: "AI 助手", href: "/chat", icon: Bot, roles: ["EMPLOYEE", "MANAGER", "IT_ADMIN", "EXECUTIVE"] },
  { label: "通知中心", href: "/notifications", icon: Bell, roles: ["EMPLOYEE", "MANAGER", "IT_ADMIN", "EXECUTIVE"] },
  { label: "个人设置", href: "/profile", icon: Settings, roles: ["EMPLOYEE", "MANAGER", "IT_ADMIN", "EXECUTIVE"] },
  { label: "审批工作台", href: "/approvals", icon: CheckSquare, roles: ["MANAGER"] },
  { label: "部门看板", href: "/dept-board", icon: BarChart3, roles: ["MANAGER"] },
  { label: "IT 工作台", href: "/it/home", icon: Wrench, roles: ["IT_ADMIN"] },
  { label: "工单工作台", href: "/it/tickets", icon: Ticket, roles: ["IT_ADMIN"] },
  { label: "资产管理", href: "/it/assets", icon: Package, roles: ["IT_ADMIN"] },
  { label: "型号管理", href: "/it/models", icon: Archive, roles: ["IT_ADMIN"] },
  { label: "入库操作", href: "/it/inbound", icon: Boxes, roles: ["IT_ADMIN"] },
  { label: "盘点", href: "/it/inventory", icon: ClipboardList, roles: ["IT_ADMIN"] },
  { label: "用户管理", href: "/it/users", icon: Users, roles: ["IT_ADMIN"] },
  { label: "审计日志", href: "/it/audit", icon: FileText, roles: ["IT_ADMIN"] },
  { label: "资产大屏", href: "/exec/dashboard", icon: PieChart, roles: ["EXECUTIVE"] },
  { label: "AI 洞察", href: "/exec/insights", icon: Lightbulb, roles: ["EXECUTIVE"] },
];

function filterNavItems(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user, setRole } = useAuth();
  if (!user) return null;
  const filteredItems = filterNavItems(navItems, user.role);

  const allRoles: UserRole[] = ["EMPLOYEE", "MANAGER", "IT_ADMIN", "EXECUTIVE"];

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand area */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-4",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? (
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
            IT
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              IT
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">资产管理系统</div>
              <div className="truncate text-xs text-sidebar-foreground/60">
                {user.department} · {user.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70",
                  collapsed && "justify-center px-0 py-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle (desktop) */}
      {onToggleCollapse && (
        <div className="hidden border-t border-sidebar-border md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center justify-center rounded-none py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground",
              collapsed ? "h-10" : "h-8 justify-start gap-2 px-3",
            )}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" />
                <span className="text-xs">收起侧栏</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Role Switcher (debug only) */}
      <Separator />
      <div className="p-2">
        {!collapsed && (
          <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            角色调试
          </div>
        )}
        <div className={cn("flex", collapsed ? "flex-col gap-1" : "flex-wrap gap-1")}>
          {allRoles.map((role) => {
            const roleLabels: Record<UserRole, string> = {
              EMPLOYEE: "员工",
              MANAGER: "经理",
              IT_ADMIN: "IT",
              EXECUTIVE: "高管",
            };
            const isActive = user.role === role;
            return (
              <button
                key={role}
                onClick={() => setRole(role)}
                title={collapsed ? roleLabels[role] : undefined}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground",
                  collapsed && "px-0 py-1 text-center text-[9px]",
                )}
              >
                {collapsed ? roleLabels[role].slice(0, 2) : roleLabels[role]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { navItems, filterNavItems };
