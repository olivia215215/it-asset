"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface AssetItem {
  id: string;
  model?: { modelName: string; brandName: string; category: string };
  status: string;
  warrantyExpiry: string;
}

interface TicketItem {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  targetModel?: { modelName: string };
}

export default function HomePage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assetRes, ticketRes] = await Promise.all([
        apiFetch<PaginatedResponse<AssetItem>>("/api/assets/mine", { params: { page: 1, pageSize: 100 } }),
        apiFetch<PaginatedResponse<TicketItem>>("/api/tickets", { params: { page: 1, pageSize: 5 } }),
      ]);
      setAssets(assetRes.data);
      setTickets(ticketRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const inUseCount = assets.filter((a) => a.status === "IN_USE" || a.status === "ASSIGNED").length;
  const repairCount = assets.filter((a) => a.status === "REPAIRING").length;
  const totalCount = assets.length;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="space-y-4 w-full max-w-4xl px-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold">欢迎, {user.name}</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "IT_ADMIN"
            ? "IT 管理控制台"
            : user.role === "MANAGER"
              ? "部门管理面板"
              : user.role === "EXECUTIVE"
                ? "高管仪表盘"
                : "我的工作台"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">总资产</p>
          <p className="text-3xl font-bold">{totalCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">使用中</p>
          <p className="text-3xl font-bold">{inUseCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">维修中</p>
          <p className="text-3xl font-bold">{repairCount}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/my-assets">
          <Button variant="outline">我的资产</Button>
        </Link>
        <Link href="/apply">
          <Button variant="outline">申领设备</Button>
        </Link>
        <Link href="/tickets">
          <Button variant="outline">我的工单</Button>
        </Link>
        <Link href="/chat">
          <Button variant="outline">AI 助手</Button>
        </Link>
        {user.role === "MANAGER" && (
          <Link href="/approvals">
            <Button variant="outline">待审批</Button>
          </Link>
        )}
        {user.role === "IT_ADMIN" && (
          <Link href="/it/home">
            <Button variant="outline">IT 管理</Button>
          </Link>
        )}
        {user.role === "EXECUTIVE" && (
          <Link href="/exec/dashboard">
            <Button variant="outline">数据看板</Button>
          </Link>
        )}
      </div>

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">最近工单</h2>
          <Link href="/tickets" className="text-sm text-primary underline-offset-4 hover:underline">
            查看全部
          </Link>
        </div>
        {tickets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            暂无工单
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {t.type === "APPLY" ? "申领" : t.type === "REPAIR" ? "报修" : t.type === "RETURN" ? "归还" : "调拨"}{" "}
                    {t.targetModel?.modelName ?? ""}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t.status}</span>
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
