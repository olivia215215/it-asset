"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Recommendation {
  modelId: string;
  score: number;
  reason: string;
}

export default function ApplyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedModelId, setSelectedModelId] = useState("");
  const [reason, setReason] = useState("");
  const [requirement, setRequirement] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommending, setRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleRecommend = async () => {
    if (!requirement.trim()) return;
    setRecommending(true);
    setRecommendError("");
    setRecommendations([]);
    try {
      type RecommendResponse =
        | { ok: true; data: { recommendations: Recommendation[]; topPick: string } }
        | { ok: false; fallback: string };
      const res = await apiFetch<RecommendResponse>(
        "/api/ai/recommend",
        { method: "POST", body: { requirement } },
      );
      if (res.ok) {
        setRecommendations(res.data.recommendations);
        if (res.data.recommendations.length > 0) {
          setSelectedModelId(res.data.recommendations[0].modelId);
        }
      } else {
        setRecommendError(res.fallback);
      }
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : "推荐失败，请稍后重试");
    } finally {
      setRecommending(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedModelId || !reason.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const ticket = await apiFetch<{ id: string }>("/api/tickets/apply", {
        method: "POST",
        body: { modelId: selectedModelId, reason },
      });
      router.push(`/tickets/${ticket.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold">申领设备</h1>

      {/* AI Recommendation */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">AI 推荐</h2>
        <p className="text-sm text-muted-foreground">
          描述你的需求，AI 将推荐最适合的设备
        </p>
        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="例如：我需要一台用于日常开发的高性能笔记本电脑"
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button onClick={handleRecommend} disabled={recommending || !requirement.trim()}>
          {recommending ? "推荐中..." : "获取推荐"}
        </Button>
        {recommendError && (
          <p className="text-sm text-destructive">{recommendError}</p>
        )}
        {recommendations.length > 0 && (
          <div className="space-y-2 mt-2">
            <p className="text-sm font-medium">推荐结果：</p>
            {recommendations.map((r) => (
              <label
                key={r.modelId}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedModelId === r.modelId ? "border-primary bg-primary/5" : ""
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={r.modelId}
                  checked={selectedModelId === r.modelId}
                  onChange={() => setSelectedModelId(r.modelId)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">型号 ID: {r.modelId}</span>
                    <span className="text-sm font-bold text-primary">{r.score}分</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Submit Form */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">提交申请</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">选择设备</label>
          {recommendations.length === 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                请先使用 AI 推荐获取设备型号，或直接输入型号 ID
              </p>
              <input
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                placeholder="输入型号 ID"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              已选择推荐列表中的设备
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">申请理由</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请说明申请理由..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}
        <Button onClick={handleSubmit} disabled={submitting || !selectedModelId || !reason.trim()}>
          {submitting ? "提交中..." : "提交申请"}
        </Button>
      </div>
    </div>
  );
}
