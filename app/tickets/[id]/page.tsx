"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface TicketDetail {
  id: string;
  type: string;
  status: string;
  reason: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  applicant: { id: string; name: string; email: string; role: string };
  targetAsset?: { id: string; model?: { modelName: string; brandName: string } };
  targetModel?: { modelName: string; brandName: string };
  assignedBy?: { id: string; name: string };
  processor?: { id: string; name: string };
  fromHolder?: { id: string; name: string };
  toHolder?: { id: string; name: string };
  targetDept?: { id: string; name: string };
  deputyApprover?: { id: string; name: string };
  deputyApproval?: boolean;
  notifications?: { id: string; type: string; title: string; body: string; createdAt: string }[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deputyMode, setDeputyMode] = useState(false);

  const id = params.id as string;

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<TicketDetail>(`/api/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleApprove = async () => {
    if (!ticket) return;
    setActionLoading("approve");
    try {
      const body: Record<string, unknown> = {};
      if (deputyMode) body.deputy = true;
      await apiFetch(`/api/tickets/${id}/approve`, { method: "POST", body });
      await fetchTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  };

  const handleReject = async () => {
    if (!ticket || !rejectReason.trim()) return;
    setActionLoading("reject");
    try {
      await apiFetch(`/api/tickets/${id}/reject`, { method: "POST", body: { rejectReason } });
      setRejectDialog(false);
      setRejectReason("");
      await fetchTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      await apiFetch(`/api/tickets/${id}/cancel`, { method: "POST" });
      await fetchTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = { APPLY: "申领", REPAIR: "报修", RETURN: "归还", TRANSFER: "调拨" };
    return map[type] ?? type;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      SUBMITTED: "已提交", PENDING_MANAGER_1: "待主管审批", PENDING_MANAGER_2: "待上级审批",
      PENDING_IT: "待IT处理", APPROVED: "已通过", REJECTED: "已驳回",
      IN_PROGRESS: "处理中", COMPLETED: "已完成", CANCELLED: "已取消",
    };
    return map[s] ?? s;
  };

  if (!user) return null;

  // Determine button visibility based on role and status
  const canApprove =
    (user.role === "MANAGER" || user.role === "IT_ADMIN") &&
    ticket &&
    ["PENDING_MANAGER_1", "PENDING_MANAGER_2", "PENDING_IT"].includes(ticket.status);
  const canReject = canApprove;
  const canCancel =
    ticket &&
    (ticket.applicant.id === user.id || user.role === "IT_ADMIN") &&
    !["COMPLETED", "REJECTED", "CANCELLED"].includes(ticket.status);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchTicket}>重试</Button>
        <Button variant="outline" onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">工单不存在</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {typeLabel(ticket.type)}工单 #{ticket.id.slice(0, 8)}
        </h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
          {statusLabel(ticket.status)}
        </span>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">申请人</p>
          <p className="text-sm font-medium">{ticket.applicant.name}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">申请时间</p>
          <p className="text-sm font-medium">{new Date(ticket.createdAt).toLocaleString("zh-CN")}</p>
        </div>
        {ticket.targetModel && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">设备型号</p>
            <p className="text-sm font-medium">{ticket.targetModel.modelName}</p>
          </div>
        )}
        {ticket.targetAsset && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">设备</p>
            <p className="text-sm font-medium">{ticket.targetAsset.model?.modelName}</p>
          </div>
        )}
        {ticket.processor && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">处理人</p>
            <p className="text-sm font-medium">{ticket.processor.name}</p>
          </div>
        )}
        {ticket.rejectReason && (
          <div className="col-span-2 rounded-lg border border-destructive/30 p-3 space-y-1">
            <p className="text-xs text-destructive">驳回原因</p>
            <p className="text-sm">{ticket.rejectReason}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium">申请理由</p>
        <p className="text-sm text-muted-foreground">{ticket.reason}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <>
            <Button onClick={handleApprove} disabled={actionLoading === "approve"}>
              {actionLoading === "approve" ? "处理中..." : "审批通过"}
            </Button>
            <Button variant="outline" onClick={() => setRejectDialog(true)} disabled={actionLoading === "reject"}>
              驳回
            </Button>
            {user.role === "IT_ADMIN" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={deputyMode} onChange={(e) => setDeputyMode(e.target.checked)} />
                代审批
              </label>
            )}
          </>
        )}
        {canCancel && (
          <Button variant="destructive" onClick={handleCancel} disabled={actionLoading === "cancel"}>
            {actionLoading === "cancel" ? "取消中..." : "取消工单"}
          </Button>
        )}
      </div>

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
              <Button variant="outline" onClick={() => { setRejectDialog(false); setRejectReason(""); }}>
                取消
              </Button>
              <Button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === "reject"}>
                确认驳回
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Timeline (from notifications) */}
      {ticket.notifications && ticket.notifications.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">时间线</h2>
          <div className="space-y-2">
            {ticket.notifications.map((n) => (
              <div key={n.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
