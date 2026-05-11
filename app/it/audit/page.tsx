"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  action: string;
  operatorName: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

export default function ItAuditPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== "IT_ADMIN") return;
    // Static placeholder
    setTimeout(() => {
      setEntries([]);
      setLoading(false);
    }, 500);
  }, []);

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
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-9 w-28 animate-pulse rounded bg-muted" />
            <div className="h-9 w-28 animate-pulse rounded bg-muted" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">审计日志</h1>

      <div className="flex gap-2">
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="">全部操作</option>
          <option value="ASSET_INBOUND">入库</option>
          <option value="ASSET_SCRAP">报废</option>
          <option value="ASSET_LOST">丢失</option>
          <option value="TICKET_APPROVE">审批</option>
          <option value="TICKET_REJECT">驳回</option>
        </select>
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="">全部类型</option>
          <option value="ASSET">资产</option>
          <option value="TICKET">工单</option>
        </select>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无审计日志</p>
          <p className="mt-1 text-xs text-muted-foreground">审计日志功能即将上线，操作记录将自动在此显示</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{e.action}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {e.operatorName} - {e.targetType}: {e.targetId}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
