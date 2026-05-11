"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, type PaginatedResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Legend,
} from "recharts";

interface AssetItem {
  id: string;
  status: string;
  model: { category: string; brandName: string };
  department?: { id: string; name: string };
}

interface TicketItem {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ExecDashboardPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assetRes, ticketRes] = await Promise.all([
        apiFetch<PaginatedResponse<AssetItem>>("/api/it/assets", { params: { page: 1, pageSize: 200 } }),
        apiFetch<PaginatedResponse<TicketItem>>("/api/it/tickets", { params: { page: 1, pageSize: 200 } }),
      ]);
      setAssets(assetRes.data);
      setTickets(ticketRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "EXECUTIVE") fetchData();
  }, []);

  if (!user) return null;
  if (user.role !== "EXECUTIVE") {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">仅高管可访问此页面</p>
      </div>
    );
  }

  const categoryData = (() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const cat = a.model?.category ?? "未知";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  })();

  const deptData = (() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const dept = a.department?.name ?? "未知";
      map.set(dept, (map.get(dept) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  })();

  const trendData = (() => {
    const map = new Map<string, number>();
    for (const t of tickets) {
      const day = new Date(t.createdAt).toLocaleDateString("zh-CN");
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-5xl space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
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
        <Button onClick={fetchData}>重试</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold">数据看板</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">总资产</p>
          <p className="text-3xl font-bold">{assets.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">总工单</p>
          <p className="text-3xl font-bold">{tickets.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">待处理</p>
          <p className="text-3xl font-bold">
            {tickets.filter((t) => ["PENDING_IT", "PENDING_MANAGER_1", "PENDING_MANAGER_2"].includes(t.status)).length}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">已完成</p>
          <p className="text-3xl font-bold">
            {tickets.filter((t) => ["COMPLETED", "APPROVED"].includes(t.status)).length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart - Asset Category Distribution */}
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">资产分类分布</h2>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine
                  label={(entry: { name?: string; percent?: number }) => `${entry.name ?? ""} ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart - Department Distribution */}
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">部门资产分布</h2>
          {deptData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart - Ticket Trend */}
        <div className="rounded-lg border p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">工单趋势</h2>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
