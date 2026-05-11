"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function ItInboundPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    id: "",
    sn: "",
    modelId: "",
    purchaseDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.id || !form.sn || !form.modelId || !form.purchaseDate) {
      setError("请填写所有必填字段");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/it/assets/inbound", {
        method: "POST",
        body: {
          id: form.id,
          sn: form.sn,
          modelId: form.modelId,
          purchaseDate: form.purchaseDate,
        },
      });
      setSuccess("入库成功");
      setForm({ id: "", sn: "", modelId: "", purchaseDate: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "入库失败");
    } finally {
      setSubmitting(false);
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold">入库登记</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">资产 ID *</label>
          <input
            value={form.id}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            placeholder="例如: AST-001"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">序列号 SN *</label>
          <input
            value={form.sn}
            onChange={(e) => setForm((f) => ({ ...f, sn: e.target.value }))}
            placeholder="例如: SN-2024-001"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">型号 ID *</label>
          <input
            value={form.modelId}
            onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value }))}
            placeholder="例如: macbook-pro-m3-2024"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">采购日期 *</label>
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-2 text-sm text-green-800 dark:text-green-400">
            {success}
          </div>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "提交中..." : "确认入库"}
        </Button>
      </form>
    </div>
  );
}
