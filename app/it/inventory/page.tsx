"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function ItInventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"sessions" | "stats" | "scans">("sessions");

  if (!user) return null;
  if (user.role !== "IT_ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅 IT 管理员可访问此页面</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">资产盘点</h1>

      <div className="flex gap-2">
        <Button variant={activeTab === "sessions" ? "default" : "outline"} onClick={() => setActiveTab("sessions")}>
          盘点会话
        </Button>
        <Button variant={activeTab === "stats" ? "default" : "outline"} onClick={() => setActiveTab("stats")}>
          统计概览
        </Button>
        <Button variant={activeTab === "scans" ? "default" : "outline"} onClick={() => setActiveTab("scans")}>
          扫描记录
        </Button>
      </div>

      {activeTab === "sessions" && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无盘点会话</p>
          <p className="mt-1 text-xs text-muted-foreground">盘点功能即将上线</p>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-sm text-muted-foreground">总资产数</p>
            <p className="text-2xl font-bold">-</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-sm text-muted-foreground">已盘点</p>
            <p className="text-2xl font-bold">-</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-sm text-muted-foreground">差异数</p>
            <p className="text-2xl font-bold">-</p>
          </div>
        </div>
      )}

      {activeTab === "scans" && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">暂无扫描记录</p>
          <p className="mt-1 text-xs text-muted-foreground">扫码盘点功能即将上线</p>
        </div>
      )}
    </div>
  );
}
