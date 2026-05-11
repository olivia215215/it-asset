"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface CountInfo {
  assets: number;
  tickets: number;
  pending: number;
}

export default function ItHomePage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<CountInfo>({ assets: 0, tickets: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCounts = async () => {
    setLoading(true);
    setError("");
    try {
      const [assetRes, ticketRes, pendingRes] = await Promise.all([
        apiFetch<PaginatedResponse<unknown>>("/api/it/assets", {
          params: { page: 1, pageSize: 1 },
        }),
        apiFetch<PaginatedResponse<unknown>>("/api/it/tickets", {
          params: { page: 1, pageSize: 1 },
        }),
        apiFetch<PaginatedResponse<unknown>>("/api/it/tickets", {
          params: { page: 1, pageSize: 1, status: "PENDING_IT" },
        }),
      ]);
      setCounts({
        assets: assetRes.pagination.total,
        tickets: ticketRes.pagination.total,
        pending: pendingRes.pagination.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
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
        <Button onClick={fetchCounts}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">IT 工作台</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">资产总数</p>
          <p className="text-3xl font-bold">{counts.assets}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">工单总数</p>
          <p className="text-3xl font-bold">{counts.tickets}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">待处理</p>
          <p className="text-3xl font-bold text-yellow-600">{counts.pending}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">快速入口</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link href="/it/tickets">
            <Button variant="outline" className="w-full justify-start">工单管理</Button>
          </Link>
          <Link href="/it/assets">
            <Button variant="outline" className="w-full justify-start">资产管理</Button>
          </Link>
          <Link href="/it/inbound">
            <Button variant="outline" className="w-full justify-start">入库登记</Button>
          </Link>
          <Link href="/it/models">
            <Button variant="outline" className="w-full justify-start">型号管理</Button>
          </Link>
          <Link href="/it/inventory">
            <Button variant="outline" className="w-full justify-start">盘点</Button>
          </Link>
          <Link href="/it/users">
            <Button variant="outline" className="w-full justify-start">用户管理</Button>
          </Link>
          <Link href="/it/audit">
            <Button variant="outline" className="w-full justify-start">审计日志</Button>
          </Link>
          <Link href="/approvals">
            <Button variant="outline" className="w-full justify-start">审批</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
