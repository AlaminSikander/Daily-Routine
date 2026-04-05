"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TaskForm } from "@/components/task-form";
import { useTimingTick } from "@/hooks/use-timing-tick";
import { categoryLabel } from "@/lib/categories";
import {
  canCompleteTaskNow,
  canStartTaskNow,
  completeTooSoonMessage,
  isScheduledTimeOver,
  startTooEarlyMessage,
  taskPatchHeaders,
} from "@/lib/task-timing-rules";
import type { TaskRow } from "@/types/database";

export default function TasksPage() {
  const nowMs = useTimingTick(2000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    setSelected(new Set());
  }, [from, to]);

  const tasksByDate = useMemo(() => {
    const m = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!m.has(t.scheduled_date)) m.set(t.scheduled_date, []);
      m.get(t.scheduled_date)!.push(t);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  const selectedCount = selected.size;
  const allVisibleSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id));

  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAllForDate(dayTasks: TaskRow[]) {
    setSelected((s) => {
      const n = new Set(s);
      const every = dayTasks.length > 0 && dayTasks.every((t) => n.has(t.id));
      if (every) dayTasks.forEach((t) => n.delete(t.id));
      else dayTasks.forEach((t) => n.add(t.id));
      return n;
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(tasks.map((t) => t.id)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function patchTask(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { ...taskPatchHeaders() },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Could not update task");
      return false;
    }
    return true;
  }

  async function setStatus(id: string, status: TaskRow["status"]) {
    const ok = await patchTask(id, { status });
    if (ok) void load();
  }

  async function startTask(id: string) {
    const ok = await patchTask(id, { started_at: new Date().toISOString() });
    if (ok) void load();
  }

  async function removeOne(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not delete task");
      return;
    }
    toast.success("Task deleted");
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    void load();
  }

  async function removeSelected() {
    if (selectedCount === 0) return;
    const ok = window.confirm(
      `Delete ${selectedCount} task${selectedCount === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!ok) return;

    const ids = [...selected];
    let failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) failed += 1;
      })
    );

    if (failed > 0) {
      toast.error(`${failed} task(s) could not be deleted.`);
    } else {
      toast.success(`Deleted ${ids.length} task${ids.length === 1 ? "" : "s"}.`);
    }
    setSelected(new Set());
    setSelectMode(false);
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Tasks</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectMode) exitSelectMode();
              else {
                setSelectMode(true);
                setSelected(new Set());
              }
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
              selectMode
                ? "border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100"
                : "border-zinc-300 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Trash2 className="h-4 w-4" />
            {selectMode ? "Cancel delete mode" : "Delete tasks…"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New task
          </button>
        </div>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm text-amber-950 dark:text-amber-100">
            <span className="font-medium">{selectedCount}</span> selected · Choose tasks below, then delete.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              disabled={tasks.length === 0}
              className="rounded-lg border border-amber-800/30 px-3 py-1.5 text-xs font-medium text-amber-950 disabled:opacity-50 dark:border-amber-200/30 dark:text-amber-50"
            >
              {allVisibleSelected ? "Clear all" : "Select all in range"}
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => void removeSelected()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Delete selected ({selectedCount})
            </button>
          </div>
        </div>
      )}

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
      ) : tasks.length === 0 ? (
        <p className="text-sm text-zinc-500">No tasks in this date range.</p>
      ) : (
        <div className="space-y-8">
          {tasksByDate.map(([date, dayTasks]) => {
            const dayAllSelected =
              dayTasks.length > 0 && dayTasks.every((t) => selected.has(t.id));
            return (
              <section key={date}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
                  <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {format(new Date(date + "T12:00:00"), "EEEE, MMM d, yyyy")}
                    <span className="ml-2 font-normal text-zinc-500">({dayTasks.length})</span>
                  </h2>
                  {selectMode && (
                    <button
                      type="button"
                      onClick={() => toggleAllForDate(dayTasks)}
                      className="text-xs font-medium text-indigo-600 underline dark:text-indigo-400"
                    >
                      {dayAllSelected ? "Deselect this day" : "Select all this day"}
                    </button>
                  )}
                </div>
                <ul className="space-y-2">
                  {dayTasks.map((t) => (
                    <li
                      key={t.id}
                      className={`flex flex-col gap-2 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between ${
                        selectMode && selected.has(t.id) ? "ring-2 ring-indigo-500/40" : ""
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selected.has(t.id)}
                            onChange={() => toggleRow(t.id)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
                            aria-label={`Select ${t.title}`}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</p>
                          <p className="text-xs text-zinc-500">
                            {t.start_time ?? "—"}–{t.end_time ?? "—"} · {categoryLabel(t.category)} ·{" "}
                            {t.priority}
                          </p>
                          <p className="text-xs capitalize text-zinc-600 dark:text-zinc-400">Status: {t.status}</p>
                        </div>
                      </div>
                      {!selectMode && (
                        <div className="flex flex-wrap gap-2">
                          {t.status === "pending" && !t.started_at && (
                            <button
                              type="button"
                              disabled={!canStartTaskNow(t, timeZone, nowMs)}
                              title={
                                startTooEarlyMessage(
                                  t.scheduled_date,
                                  t.start_time,
                                  timeZone,
                                  nowMs
                                ) ?? undefined
                              }
                              onClick={() => void startTask(t.id)}
                              className="rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}
                          {t.status === "pending" && t.started_at && (
                            <button
                              type="button"
                              disabled={!canCompleteTaskNow(t, nowMs)}
                              title={completeTooSoonMessage(t.started_at, nowMs) ?? undefined}
                              onClick={() => void setStatus(t.id, "completed")}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Complete
                            </button>
                          )}
                          {t.status === "pending" &&
                            !t.started_at &&
                            isScheduledTimeOver(t, timeZone, nowMs) && (
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
                            onClick={() => void removeOne(t.id)}
                            className="rounded-lg px-2 py-1 text-xs text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <TaskForm open={open} onClose={() => setOpen(false)} onCreated={() => void load()} />
    </div>
  );
}
