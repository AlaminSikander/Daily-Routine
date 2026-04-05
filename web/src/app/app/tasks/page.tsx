"use client";

import { useCallback, useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { Plus } from "lucide-react";
import { TaskForm } from "@/components/task-form";
import { categoryLabel } from "@/lib/categories";
import type { TaskRow } from "@/types/database";

export default function TasksPage() {
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tasks?from=${from}&to=${to}`);
    const j = await res.json();
    if (res.ok) setTasks((j.tasks as TaskRow[]) ?? []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: TaskRow["status"]) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Tasks</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          New task
        </button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="flex items-center gap-2">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</p>
                <p className="text-xs text-zinc-500">
                  {t.scheduled_date} · {t.start_time ?? "—"}–{t.end_time ?? "—"} ·{" "}
                  {categoryLabel(t.category)} · {t.priority}
                </p>
                <p className="text-xs capitalize text-zinc-600 dark:text-zinc-400">Status: {t.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {t.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => void setStatus(t.id, "completed")}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white"
                  >
                    Complete
                  </button>
                )}
                {t.status !== "missed" && t.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => void setStatus(t.id, "missed")}
                    className="rounded-lg border border-amber-600 px-2 py-1 text-xs text-amber-800 dark:text-amber-200"
                  >
                    Missed
                  </button>
                )}
                {t.status === "completed" && (
                  <button
                    type="button"
                    onClick={() => void setStatus(t.id, "pending")}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                  >
                    Reopen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(t.id)}
                  className="rounded-lg px-2 py-1 text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TaskForm open={open} onClose={() => setOpen(false)} onCreated={() => void load()} />
    </div>
  );
}
