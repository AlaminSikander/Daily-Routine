"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

type Summary = {
  range_days: number;
  totals: { total: number; completed: number; missed: number; pending: number };
  completion_rate: number;
  by_category: Record<string, { total: number; done: number }>;
  trend: { date: string; completion_pct: number }[];
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/analytics/summary?days=${days}`);
    const j = await res.json();
    if (res.ok) setSummary(j as Summary);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const catData =
    summary &&
    Object.entries(summary.by_category).map(([name, v]) => ({
      name: name.replace(/_/g, " "),
      done: v.done,
      missed: v.total - v.done,
    }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Analytics</h1>
          <p className="text-sm text-zinc-500">Daily / weekly-style views powered by your task history.</p>
        </div>
        <label className="text-sm text-zinc-600 dark:text-zinc-300">
          Range (days)
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="ml-2 rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          >
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>
        </label>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
            <p className="text-xs uppercase text-zinc-500">Completion rate</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {Math.round(summary.completion_rate * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
            <p className="text-xs uppercase text-zinc-500">Completed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.totals.completed}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
            <p className="text-xs uppercase text-zinc-500">Missed</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.totals.missed}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
            <p className="text-xs uppercase text-zinc-500">Pending</p>
            <p className="mt-1 text-2xl font-bold text-zinc-700 dark:text-zinc-200">{summary.totals.pending}</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Completion % by day</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completion_pct" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {catData && catData.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">By category</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="done" stackId="a" fill="#22c55e" name="Done" />
                <Bar dataKey="missed" stackId="a" fill="#f59e0b" name="Not done" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
