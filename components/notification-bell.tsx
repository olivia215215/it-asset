"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export function NotificationBell() {
  const { unreadNotifications } = useAuth();

  return (
    <Link href="/notifications">
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative"
        aria-label={`通知${unreadNotifications > 0 ? ` (${unreadNotifications}条未读)` : ""}`}
      >
        <Bell className="size-4" />
        {unreadNotifications > 0 && (
          <Badge className="absolute -top-1 -right-1 flex size-4 min-w-0 items-center justify-center rounded-full p-0 text-[10px] leading-none">
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
