"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function ExecInsightsPage() {
  const { user } = useAuth();
  const [triageResult, setTriageResult] = useState("");
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState("");

  const handleTriage = async () => {
    setTriageLoading(true);
    setTriageError("");
    setTriageResult("");
    try {
      const res = await apiFetch("/api/ai/recommend", {
        method: "POST",
        body: { requirement: "分析当前资产状况和工单趋势，提供管理建议" },
      });
      const text =
        typeof res === "string"
          ? res
          : JSON.stringify(res, null, 2);
      setTriageResult(text);
    } catch (err) {
      setTriageError(err instanceof Error ? err.message : "AI 分析失败");
    } finally {
      setTriageLoading(false);
    }
  };

  if (!user) return null;
  if (user.role !== "EXECUTIVE") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅高管可访问此页面</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">AI 洞察</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">资产健康度</p>
          <p className="text-2xl font-bold">-</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">工单平均处理时间</p>
          <p className="text-2xl font-bold">-</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">保修即将到期</p>
          <p className="text-2xl font-bold">-</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">异常资产数</p>
          <p className="text-2xl font-bold">-</p>
        </div>
      </div>

      {/* AI Triage Demo */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">AI 分诊演示</h2>
        <p className="text-sm text-muted-foreground">
          点击下方按钮，AI 将分析当前资产和工单数据并提供管理洞察。
        </p>
        <Button onClick={handleTriage} disabled={triageLoading}>
          {triageLoading ? "分析中..." : "运行 AI 分析"}
        </Button>

        {triageError && (
          <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {triageError}
          </div>
        )}

        {triageResult && (
          <div className="rounded-lg bg-muted p-4">
            <pre className="text-sm whitespace-pre-wrap">{triageResult}</pre>
          </div>
        )}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">资产趋势预测</p>
          <p className="text-xs text-muted-foreground mt-1">数据不足，暂无法展示</p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">成本优化建议</p>
          <p className="text-xs text-muted-foreground mt-1">数据不足，暂无法展示</p>
        </div>
      </div>
    </div>
  );
}
