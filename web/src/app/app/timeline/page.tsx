"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { categoryLabel } from "@/lib/categories";
import type { TaskRow } from "@/types/database";

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); /* 5:00 – 23:00 */

export default function TimelinePage() {
  const day = format(new Date(), "yyyy-MM-dd");
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?from=${day}&to=${day}`);
    const j = await res.json();
    if (res.ok) setTasks((j.tasks as TaskRow[]) ?? []);
  }, [day]);

  useEffect(() => {
    void load();
  }, [load]);

  const byHour = useMemo(() => {
    const m = new Map<number, TaskRow[]>();
    for (const t of tasks) {
      if (!t.start_time) continue;
      const h = parseInt(t.start_time.slice(0, 2), 10);
      if (!m.has(h)) m.set(h, []);
      m.get(h)!.push(t);
    }
    return m;
  }, [tasks]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Timeline</h1>
        <p className="text-sm text-zinc-500">Full-day view · {format(new Date(), "EEEE, MMM d")}</p>
      </div>
      <div className="space-y-2">
        {HOURS.map((h) => {
          const list = byHour.get(h) ?? [];
          const label = `${String(h).padStart(2, "0")}:00`;
          return (
            <div
              key={h}
              className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-zinc-200 bg-[var(--card)] p-3 dark:border-zinc-800"
            >
              <div className="text-xs font-semibold text-zinc-500">{label}</div>
              <div className="space-y-2">
                {list.length === 0 && <p className="text-xs text-zinc-400">—</p>}
                {list.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-sm dark:border-indigo-900 dark:bg-indigo-950/40"
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</p>
                    <p className="text-xs text-zinc-500">
                      {t.start_time}–{t.end_time ?? "—"} · {categoryLabel(t.category)} · {t.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
