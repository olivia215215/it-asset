"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ModelItem {
  id: string;
  category: string;
  brandName: string;
  modelName: string;
  specs: Record<string, unknown>;
  purchasePrice?: number;
  warrantyMonths: number;
  status: string;
  stock?: number;
}

export default function ItModelsPage() {
  const { user } = useAuth();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchModels = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch all assets and derive model info
      const res = await apiFetch<{ data: ModelItem[] }>("/api/it/assets", {
        params: { page: 1, pageSize: 100 },
      });
      // Extract unique models from assets
      const modelMap = new Map<string, ModelItem>();
      for (const a of res.data) {
        const model = (a as unknown as { model: ModelItem }).model;
        if (model && !modelMap.has(model.id)) {
          modelMap.set(model.id, { ...model, stock: 0 });
        }
      }
      setModels(Array.from(modelMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === "IT_ADMIN") fetchModels();
  }, []);

  if (user.role !== "IT_ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅 IT 管理员可访问此页面</p>
      </div>
    );
  }

  const categoryLabel: Record<string, string> = {
    LAPTOP: "笔记本", MONITOR: "显示器", KEYBOARD: "键盘",
    MOUSE: "鼠标", HEADPHONE: "耳机", OTHER: "其他",
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
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
        <Button onClick={fetchModels}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">型号管理</h1>

      {models.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无型号数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {models.map((m) => (
            <div key={m.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{m.brandName} {m.modelName}</p>
                  <p className="text-sm text-muted-foreground">
                    {categoryLabel[m.category] ?? m.category}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {m.status}
                </span>
              </div>
              {m.purchasePrice !== undefined && (
                <p className="text-sm">
                  参考价格: ¥{Number(m.purchasePrice).toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                保修: {m.warrantyMonths}个月
              </p>
              {m.stock !== undefined && (
                <p className="text-sm">
                  库存: <span className="font-medium">{m.stock}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
