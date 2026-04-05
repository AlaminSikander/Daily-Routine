"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import type { TaskRow } from "@/types/database";

type View = "month" | "week" | "day";

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const range = useMemo(() => {
    if (view === "day") {
      const d = format(cursor, "yyyy-MM-dd");
      return { from: d, to: d };
    }
    if (view === "week") {
      const start = new Date(cursor);
      const dow = start.getDay();
      start.setDate(start.getDate() - dow);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
    }
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
  }, [cursor, view]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?from=${range.from}&to=${range.to}`);
    const j = await res.json();
    if (res.ok) setTasks((j.tasks as TaskRow[]) ?? []);
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      const k = t.scheduled_date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [tasks]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Calendar</h1>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                view === v
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
          onClick={() =>
            setCursor((c) => {
              const n = new Date(c);
              if (view === "month") return subMonths(n, 1);
              if (view === "week") n.setDate(n.getDate() - 7);
              else n.setDate(n.getDate() - 1);
              return n;
            })
          }
        >
          ←
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
          onClick={() => setCursor(new Date())}
        >
          Today
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
          onClick={() =>
            setCursor((c) => {
              const n = new Date(c);
              if (view === "month") return addMonths(n, 1);
              if (view === "week") n.setDate(n.getDate() + 7);
              else n.setDate(n.getDate() + 1);
              return n;
            })
          }
        >
          →
        </button>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {view === "month" && format(cursor, "MMMM yyyy")}
          {view === "week" && `${range.from} → ${range.to}`}
          {view === "day" && format(cursor, "EEEE, MMM d, yyyy")}
        </span>
      </div>

      {view === "month" && (
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
          {monthDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const list = byDate.get(key) ?? [];
            return (
              <div
                key={key}
                className={`min-h-[88px] rounded-lg border border-zinc-100 p-1 text-left dark:border-zinc-800 ${
                  isSameMonth(day, cursor) ? "bg-[var(--card)]" : "bg-zinc-50 dark:bg-zinc-900/50"
                }`}
              >
                <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                  {format(day, "d")}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {list.slice(0, 3).map((t) => (
                    <li key={t.id} className="truncate rounded bg-indigo-100 px-1 text-[10px] text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
                      {t.start_time?.slice(0, 5)} {t.title}
                    </li>
                  ))}
                  {list.length > 3 && (
                    <li className="text-[10px] text-zinc-500">+{list.length - 3} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {(view === "week" || view === "day") && (
        <ul className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-zinc-500">No tasks in this range.</p>}
          {tasks.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-zinc-200 bg-[var(--card)] px-4 py-3 text-sm dark:border-zinc-800"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</span>
              <span className="ml-2 text-zinc-500">
                {t.scheduled_date} {t.start_time} · {categoryLabel(t.category)} · {t.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-zinc-500">
        Prefer a clock view?{" "}
        <Link href="/app/timeline" className="text-indigo-600 underline dark:text-indigo-400">
          Open timeline
        </Link>
      </p>
    </div>
  );
}
