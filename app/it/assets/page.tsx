"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface AssetItem {
  id: string;
  sn: string;
  status: string;
  modelId: string;
  model: { modelName: string; brandName: string; category: string };
  holder?: { id: string; name: string };
  purchaseDate: string;
  warrantyExpiry: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "IN_STOCK", label: "在库" },
  { value: "AVAILABLE", label: "可用" },
  { value: "ASSIGNED", label: "已分配" },
  { value: "IN_USE", label: "使用中" },
  { value: "RETURNING", label: "归还中" },
  { value: "REPAIRING", label: "维修中" },
  { value: "TRANSFERRING", label: "调拨中" },
  { value: "LOST", label: "丢失" },
  { value: "SCRAPPED", label: "已报废" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "全部分类" },
  { value: "LAPTOP", label: "笔记本" },
  { value: "MONITOR", label: "显示器" },
  { value: "KEYBOARD", label: "键盘" },
  { value: "MOUSE", label: "鼠标" },
  { value: "HEADPHONE", label: "耳机" },
  { value: "OTHER", label: "其他" },
];

export default function ItAssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [snSearch, setSnSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAssets = async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<PaginatedResponse<AssetItem>>("/api/it/assets", {
        params: {
          page: p,
          pageSize: 20,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          sn: snSearch || undefined,
        },
      });
      setAssets(res.data);
      setTotalPages(res.pagination.totalPages);
      setPage(res.pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === "IT_ADMIN") fetchAssets(1);
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user.role === "IT_ADMIN") fetchAssets(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [snSearch]);

  if (user.role !== "IT_ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅 IT 管理员可访问此页面</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      IN_USE: "bg-green-100 text-green-800", ASSIGNED: "bg-blue-100 text-blue-800",
      IN_STOCK: "bg-gray-100 text-gray-800", AVAILABLE: "bg-gray-100 text-gray-800",
      REPAIRING: "bg-yellow-100 text-yellow-800", RETURNING: "bg-purple-100 text-purple-800",
      TRANSFERRING: "bg-orange-100 text-orange-800", LOST: "bg-red-100 text-red-800",
      SCRAPPED: "bg-red-100 text-red-800",
    };
    const label: Record<string, string> = {
      IN_USE: "使用中", ASSIGNED: "已分配", IN_STOCK: "在库", AVAILABLE: "可用",
      REPAIRING: "维修中", RETURNING: "归还中", TRANSFERRING: "调拨中",
      LOST: "丢失", SCRAPPED: "已报废",
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
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          {[1, 2, 3, 4].map((i) => (
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
        <Button onClick={() => fetchAssets(1)}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold">资产管理</h1>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          value={snSearch}
          onChange={(e) => setSnSearch(e.target.value)}
          placeholder="搜索序列号..."
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无资产</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {assets.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/it/assets/${a.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{a.model.brandName} {a.model.modelName}</span>
                    <span className="text-xs text-muted-foreground font-mono">{a.sn}</span>
                    <span className="text-xs text-muted-foreground">{a.model.category}</span>
                  </div>
                  {statusBadge(a.status)}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>持有人: {a.holder?.name ?? "-"}</span>
                  <span>采购: {new Date(a.purchaseDate).toLocaleDateString("zh-CN")}</span>
                  <span>保修: {new Date(a.warrantyExpiry).toLocaleDateString("zh-CN")}</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => fetchAssets(page - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => fetchAssets(page + 1)}>
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
