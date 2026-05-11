"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ApprovalTicket {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  applicant: { id: string; name: string; email: string };
  targetModel?: { modelName: string; brandName: string };
  targetAsset?: { id: string; model?: { modelName: string } };
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [tickets, setTickets] = useState<ApprovalTicket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approveLoading, setApproveLoading] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deputyMode, setDeputyMode] = useState(false);

  const fetchApprovals = async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const endpoint = tab === "pending" ? "/api/approvals/pending" : "/api/approvals/history";
      const res = await apiFetch<PaginatedResponse<ApprovalTicket>>(endpoint, {
        params: { page: p, pageSize: 20 },
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
    fetchApprovals(1);
  }, [tab]);

  const handleApprove = async (id: string) => {
    setApproveLoading(id);
    try {
      const body: Record<string, unknown> = {};
      if (deputyMode) body.deputy = true;
      await apiFetch(`/api/tickets/${id}/approve`, { method: "POST", body });
      await fetchApprovals(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setApproveLoading("");
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setApproveLoading(rejectDialog.id);
    try {
      await apiFetch(`/api/tickets/${rejectDialog.id}/reject`, {
        method: "POST",
        body: { rejectReason },
      });
      setRejectDialog(null);
      setRejectReason("");
      await fetchApprovals(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setApproveLoading("");
    }
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = { APPLY: "申领", REPAIR: "报修", RETURN: "归还", TRANSFER: "调拨" };
    return map[type] ?? type;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING_MANAGER_1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PENDING_MANAGER_2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PENDING_IT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    const label: Record<string, string> = {
      PENDING_MANAGER_1: "待审批", PENDING_MANAGER_2: "待审批",
      PENDING_IT: "待IT处理", APPROVED: "已通过",
      REJECTED: "已驳回", COMPLETED: "已完成", CANCELLED: "已取消",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>
        {label[status] ?? status}
      </span>
    );
  };

  if (!user) return null;
  if (!["MANAGER", "IT_ADMIN"].includes(user.role)) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">你无权访问此页面</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          </div>
          {[1, 2, 3].map((i) => (
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
        <Button onClick={() => fetchApprovals(1)}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">审批管理</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>
          待审批
        </Button>
        <Button variant={tab === "history" ? "default" : "outline"} onClick={() => setTab("history")}>
          已审批
        </Button>
      </div>

      {/* Deputy mode toggle (IT_ADMIN only) */}
      {user.role === "IT_ADMIN" && tab === "pending" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={deputyMode} onChange={(e) => setDeputyMode(e.target.checked)} />
          代审批模式
        </label>
      )}

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            {tab === "pending" ? "暂无待审批的工单" : "暂无审批记录"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{typeLabel(t.type)}</span>
                      <span className="text-sm text-muted-foreground">
                        {t.applicant.name}
                      </span>
                      {statusBadge(t.status)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{t.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/tickets/${t.id}`)}
                      variant="outline"
                    >
                      详情
                    </Button>
                    {tab === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(t.id)}
                          disabled={approveLoading === t.id}
                        >
                          {approveLoading === t.id ? "..." : "通过"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectDialog({ id: t.id })}
                          disabled={approveLoading === t.id}
                        >
                          驳回
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => fetchApprovals(page - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => fetchApprovals(page + 1)}>
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      {/* Reject Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 space-y-4">
            <h3 className="font-semibold">驳回工单</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>
                取消
              </Button>
              <Button onClick={handleReject} disabled={!rejectReason.trim()}>
                确认驳回
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
