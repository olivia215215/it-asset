"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AssetModel {
  modelName: string;
  brandName: string;
  category: string;
}

interface AssetItem {
  id: string;
  sn?: string;
  status: string;
  warrantyExpiry: string;
  purchaseDate?: string;
  model?: AssetModel;
}

export default function MyAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAssets = async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<PaginatedResponse<AssetItem>>("/api/assets/mine", {
        params: { page: p, pageSize: 20 },
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
    fetchAssets(1);
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      IN_USE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      IN_STOCK: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      AVAILABLE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      REPAIRING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      RETURNING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      TRANSFERRING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      LOST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      SCRAPPED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    const label: Record<string, string> = {
      IN_USE: "使用中",
      ASSIGNED: "已分配",
      IN_STOCK: "在库",
      AVAILABLE: "可用",
      REPAIRING: "维修中",
      RETURNING: "归还中",
      TRANSFERRING: "调拨中",
      LOST: "丢失",
      SCRAPPED: "已报废",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-800"}`}>
        {label[status] ?? status}
      </span>
    );
  };

  const warrantyStatus = (expiry: string) => {
    const now = new Date();
    const exp = new Date(expiry);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return "已过保";
    if (daysLeft < 30) return `${daysLeft}天后到期`;
    return `${daysLeft}天`;
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
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
        <Button onClick={() => fetchAssets(1)}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold">我的资产</h1>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无资产</p>
          <Link href="/apply">
            <Button>申领设备</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{asset.model?.modelName ?? "未知型号"}</p>
                    <p className="text-sm text-muted-foreground">{asset.model?.brandName}</p>
                  </div>
                  {statusBadge(asset.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  分类: {asset.model?.category ?? "未知"}
                </p>
                <p className="text-xs text-muted-foreground">
                  保修: {warrantyStatus(asset.warrantyExpiry)}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => fetchAssets(page - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
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
