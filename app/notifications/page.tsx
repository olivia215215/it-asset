"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  relatedTicketId?: string;
  relatedAssetId?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user, setUnreadNotifications } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      // Derive notifications from tickets
      const res = await apiFetch<PaginatedResponse<{ id: string; type: string; status: string; createdAt: string; updatedAt: string }>>(
        "/api/tickets",
        { params: { page: 1, pageSize: 50 } },
      );
      const items: NotificationItem[] = res.data.map((t) => ({
        id: t.id,
        type: "APPROVAL_RESULT",
        title: t.type === "APPLY" ? "申领工单" : t.type === "REPAIR" ? "报修工单" : t.type === "RETURN" ? "归还工单" : "调拨工单",
        body: `状态更新为: ${t.status}`,
        read: ["COMPLETED", "CANCELLED", "REJECTED"].includes(t.status),
        relatedTicketId: t.id,
        createdAt: t.updatedAt,
      }));
      setNotifications(items);
      const unread = items.filter((n) => !n.read).length;
      setUnreadNotifications(unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifications(0);
  };

  const typeIcon = (type: string) => {
    const map: Record<string, string> = {
      APPROVAL_REQUEST: "📋",
      APPROVAL_RESULT: "✅",
      PICKUP_READY: "📦",
      REPAIR_UPDATE: "🔧",
      WARRANTY_EXPIRY: "⚠️",
      TRANSFER_REQUEST: "🔄",
      RETURN_SUBMITTED: "📤",
    };
    return map[type] ?? "📩";
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchNotifications}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知</h1>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            全部标记已读
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                !n.read ? "border-l-4 border-l-primary" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {new Date(n.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                  {n.relatedTicketId && (
                    <Link
                      href={`/tickets/${n.relatedTicketId}`}
                      className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
                    >
                      查看工单
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
