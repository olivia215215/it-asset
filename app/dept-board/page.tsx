"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface TicketItem {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  applicant: { name: string };
}

export default function DeptBoardPage() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [recentTickets, setRecentTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, recentRes] = await Promise.all([
        apiFetch<PaginatedResponse<TicketItem>>("/api/approvals/pending", {
          params: { page: 1, pageSize: 1 },
        }),
        apiFetch<PaginatedResponse<TicketItem>>("/api/approvals/history", {
          params: { page: 1, pageSize: 5 },
        }),
      ]);
      setPendingCount(pendingRes.pagination.total);
      setRecentTickets(recentRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (user.role !== "MANAGER") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅主管可访问此页面</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">部门面板</h1>
      <p className="text-sm text-muted-foreground">{user.department}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">待审批</p>
          <p className="text-3xl font-bold text-primary">{pendingCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">部门</p>
          <p className="text-lg font-medium">{user.department}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">角色</p>
          <p className="text-lg font-medium">主管</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/approvals">
          <Button>审批管理</Button>
        </Link>
        <Link href="/my-assets">
          <Button variant="outline">部门资产</Button>
        </Link>
        <Link href="/tickets">
          <Button variant="outline">工单列表</Button>
        </Link>
      </div>

      {/* Recent */}
      <div>
        <h2 className="text-lg font-semibold mb-3">最近审批记录</h2>
        {recentTickets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            暂无审批记录
          </div>
        ) : (
          <div className="space-y-2">
            {recentTickets.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.applicant.name} - {t.type}</span>
                  <span className="text-xs text-muted-foreground">{t.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{t.reason}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
