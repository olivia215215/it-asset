"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface TicketItem {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  applicant: { id: string; name: string; email: string };
  targetModel?: { modelName: string };
  targetAsset?: { id: string; model?: { modelName: string } };
}

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "APPLY", label: "申领" },
  { value: "REPAIR", label: "报修" },
  { value: "RETURN", label: "归还" },
  { value: "TRANSFER", label: "调拨" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "SUBMITTED", label: "已提交" },
  { value: "PENDING_MANAGER_1", label: "待主管审批" },
  { value: "PENDING_MANAGER_2", label: "待上级审批" },
  { value: "PENDING_IT", label: "待IT处理" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已驳回" },
  { value: "IN_PROGRESS", label: "处理中" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export default function ItTicketsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<PaginatedResponse<TicketItem>>("/api/it/tickets", {
        params: { page: p, pageSize: 20, type: typeFilter || undefined, status: statusFilter || undefined },
      });
      setTickets(res.data);
      setTotalPages(res.pagination.totalPages);
      setPage(res.pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === "IT_ADMIN") fetchTickets(1);
  }, [typeFilter, statusFilter]);

  if (user.role !== "IT_ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅 IT 管理员可访问此页面</p>
      </div>
    );
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { APPLY: "申领", REPAIR: "报修", RETURN: "归还", TRANSFER: "调拨" };
    return map[t] ?? t;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      SUBMITTED: "bg-gray-100 text-gray-800", PENDING_MANAGER_1: "bg-blue-100 text-blue-800",
      PENDING_MANAGER_2: "bg-blue-100 text-blue-800", PENDING_IT: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800",
      IN_PROGRESS: "bg-purple-100 text-purple-800", COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    };
    const label: Record<string, string> = {
      SUBMITTED: "已提交", PENDING_MANAGER_1: "待主管审批", PENDING_MANAGER_2: "待上级审批",
      PENDING_IT: "待IT处理", APPROVED: "已通过", REJECTED: "已驳回",
      IN_PROGRESS: "处理中", COMPLETED: "已完成", CANCELLED: "已取消",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
        {label[status] ?? status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-5xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => fetchTickets(1)}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold">工单管理</h1>

      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无工单</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/tickets/${t.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{typeLabel(t.type)}</span>
                    <span className="text-sm text-muted-foreground">{t.applicant.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {t.targetModel?.modelName ?? t.targetAsset?.model?.modelName ?? ""}
                    </span>
                  </div>
                  {statusBadge(t.status)}
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{t.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => fetchTickets(page - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => fetchTickets(page + 1)}>
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
