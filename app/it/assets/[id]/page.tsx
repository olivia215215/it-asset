"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface TicketRef {
  id: string;
  type: string;
  status: string;
  reason: string;
  createdAt: string;
  applicant: { id: string; name: string };
}

interface TimelineEntry {
  id: string;
  action: string;
  operator: { id: string; name: string };
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface AssetDetail {
  id: string;
  sn: string;
  status: string;
  modelId: string;
  model: { modelName: string; brandName: string; category: string; specs: unknown };
  holder?: { id: string; name: string; email: string };
  department?: { id: string; name: string };
  purchaseDate: string;
  warrantyExpiry: string;
  scrapReason?: string;
  lostReason?: string;
  tickets?: TicketRef[];
}

export default function ItAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrapDialog, setScrapDialog] = useState(false);
  const [lostDialog, setLostDialog] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const id = params.id as string;

  const fetchDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const [assetData, timelineRes] = await Promise.all([
        apiFetch<AssetDetail>(`/api/it/assets/${id}`),
        apiFetch<PaginatedResponse<TimelineEntry>>(`/api/it/assets/${id}/timeline`, {
          params: { page: 1, pageSize: 50 },
        }),
      ]);
      setAsset(assetData);
      setTimeline(timelineRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "IT_ADMIN") fetchDetail();
  }, [id]);

  const handleScrap = async () => {
    if (!actionReason.trim()) return;
    setActionLoading("scrap");
    try {
      await apiFetch(`/api/it/assets/${id}/scrap`, {
        method: "POST",
        body: { scrapReason: actionReason },
      });
      setScrapDialog(false);
      setActionReason("");
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  };

  const handleLost = async () => {
    if (!actionReason.trim()) return;
    setActionLoading("lost");
    try {
      await apiFetch(`/api/it/assets/${id}/lost`, {
        method: "POST",
        body: { lostReason: actionReason },
      });
      setLostDialog(false);
      setActionReason("");
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading("");
    }
  };

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
        <div className="w-full max-w-3xl space-y-4">
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
        <Button onClick={fetchDetail}>重试</Button>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">资产不存在</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    IN_USE: "使用中", ASSIGNED: "已分配", IN_STOCK: "在库", AVAILABLE: "可用",
    REPAIRING: "维修中", RETURNING: "归还中", TRANSFERRING: "调拨中",
    LOST: "丢失", SCRAPPED: "已报废",
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{asset.model.brandName} {asset.model.modelName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{asset.sn}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
          {statusLabel[asset.status] ?? asset.status}
        </span>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">资产 ID</p>
          <p className="text-sm font-mono">{asset.id}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">分类</p>
          <p className="text-sm">{asset.model.category}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">持有人</p>
          <p className="text-sm">{asset.holder?.name ?? "-"}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">部门</p>
          <p className="text-sm">{asset.department?.name ?? "-"}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">采购日期</p>
          <p className="text-sm">{new Date(asset.purchaseDate).toLocaleDateString("zh-CN")}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">保修到期</p>
          <p className="text-sm">{new Date(asset.warrantyExpiry).toLocaleDateString("zh-CN")}</p>
        </div>
      </div>

      {/* Actions */}
      {asset.status !== "SCRAPPED" && asset.status !== "LOST" && (
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setScrapDialog(true)}>
            报废
          </Button>
          <Button variant="destructive" onClick={() => setLostDialog(true)}>
            标记丢失
          </Button>
        </div>
      )}

      {/* Related Tickets */}
      {asset.tickets && asset.tickets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">关联工单</h2>
          <div className="space-y-2">
            {asset.tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/tickets/${t.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.type} - {t.applicant.name}</span>
                  <span className="text-xs text-muted-foreground">{t.status}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{t.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">生命周期</h2>
        {timeline.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            暂无记录
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.operator.name} - {new Date(entry.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scrap Dialog */}
      {scrapDialog && (
        <ActionDialog
          title="报废资产"
          reason={actionReason}
          setReason={setActionReason}
          onConfirm={handleScrap}
          onCancel={() => { setScrapDialog(false); setActionReason(""); }}
          loading={actionLoading === "scrap"}
        />
      )}

      {/* Lost Dialog */}
      {lostDialog && (
        <ActionDialog
          title="标记丢失"
          reason={actionReason}
          setReason={setActionReason}
          onConfirm={handleLost}
          onCancel={() => { setLostDialog(false); setActionReason(""); }}
          loading={actionLoading === "lost"}
        />
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function ActionDialog({
  title,
  reason,
  setReason,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  reason: string;
  setReason: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-background p-6 space-y-4">
        <h3 className="font-semibold">{title}</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="请输入原因..."
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={onConfirm} disabled={!reason.trim() || loading}>
            {loading ? "处理中..." : "确认"}
          </Button>
        </div>
      </div>
    </div>
  );
}
