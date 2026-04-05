"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TaskForm } from "@/components/task-form";
import { VoiceQuickAdd } from "@/components/voice-quick-add";
import { MissedRecoveryCard } from "@/components/missed-recovery";
import { categoryLabel } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import type { TaskRow } from "@/types/database";

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [habitWeek, setHabitWeek] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?from=${today}&to=${today}`);
      const j = await res.json();
      if (res.ok) setTasks((j.tasks as TaskRow[]) ?? []);

      const s = await fetch("/api/ai/suggestions");
      const sj = await s.json();
      if (s.ok) setSuggestions((sj.suggestions as string[]) ?? []);

      const supabase = createClient();
      const start = format(new Date(Date.now() - 6 * 86400000), "yyyy-MM-dd");
      const { data: logs } = await supabase
        .from("habit_logs")
        .select("id")
        .gte("log_date", start)
        .lte("log_date", today);
      setHabitWeek(logs?.length ?? 0);
    } catch {
      toast.error("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  const { completed, pending, missed, overdue, pct, nextTask } = useMemo(() => {
    const now = new Date();
    const list = tasks;
    let completed = 0;
    let pending = 0;
    let missed = 0;
    const overdue: TaskRow[] = [];
    for (const t of list) {
      if (t.status === "completed") completed += 1;
      else if (t.status === "missed") missed += 1;
      else {
        pending += 1;
        if (t.start_time) {
          const [h, m] = t.start_time.split(":").map(Number);
          const due = new Date(`${t.scheduled_date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
          if (due < now) overdue.push(t);
        }
      }
    }
    const total = list.length || 1;
    const pct = Math.round((100 * completed) / total);
    const nextTask = list
      .filter((t) => t.status === "pending")
      .sort((a, b) => (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99"))[0];
    return { completed, pending, missed, overdue, pct, nextTask };
  }, [tasks]);

  const missedPrompts = tasks.filter((t) => t.status === "missed" && !t.missed_recovery_prompted);

  async function toggleTask(t: TaskRow) {
    const next = t.status === "completed" ? "pending" : "completed";
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof j.error === "string" ? j.error : "Could not update task";
      toast.error(msg);
      return;
    }
    void load();
  }

  async function snooze(t: TaskRow, minutes: number) {
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snooze_until: until }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Could not snooze");
      return;
    }
    toast.success(`Snoozed ${minutes} minutes`);
    void load();
  }

  async function queueVoiceTasks(parsed: unknown[]) {
    let added = 0;
    for (const raw of parsed) {
      const t = raw as Record<string, string>;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.title,
          category: t.category,
          scheduled_date: t.scheduled_date,
          start_time: t.start_time,
          end_time: null,
          priority: t.priority ?? "medium",
          repeat_type: t.repeat_type ?? "none",
          reminders: [],
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof j.error === "string" ? j.error : "Could not add task";
        toast.error(msg);
      } else {
        added += 1;
      }
    }
    if (added > 0) toast.success(`Added ${added} task(s)`);
    void load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Today · {format(new Date(), "EEEE, MMM d")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Checklist, next action, streaks, and light AI coaching.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Quick add
        </button>
      </div>

      {missedPrompts.map((t) => (
        <MissedRecoveryCard key={t.id} task={t} onDone={() => void load()} />
      ))}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Progress</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{pct}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {completed}/{tasks.length || 0} completed · {pending} pending · {missed} missed
            {overdue.length > 0 && ` · ${overdue.length} overdue`}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Next task</p>
          {nextTask ? (
            <div className="mt-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{nextTask.title}</p>
              <p className="text-sm text-zinc-500">
                {nextTask.start_time ?? "—"} · {categoryLabel(nextTask.category)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void toggleTask(nextTask)}
                  className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => void snooze(nextTask, 5)}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                >
                  Snooze 5m
                </button>
                <button
                  type="button"
                  onClick={() => void snooze(nextTask, 15)}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                >
                  Snooze 15m
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Nothing scheduled — add a task or enjoy the win.</p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Habit logs (7d)</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{habitWeek}</p>
          <Link href="/app/habits" className="mt-2 inline-block text-xs text-indigo-600 underline dark:text-indigo-400">
            Manage habits
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Today&apos;s checklist</h2>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No tasks for today.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={t.status === "completed"}
                      onChange={() => void toggleTask(t)}
                    />
                    <span className={t.status === "completed" ? "text-zinc-400 line-through" : ""}>
                      {t.title}
                    </span>
                  </label>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {t.start_time ?? "—"} · {categoryLabel(t.category)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <VoiceQuickAdd onTasksParsed={(tasks) => void queueVoiceTasks(tasks)} />
          <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">AI suggestions</h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-zinc-600 dark:text-zinc-300">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Calendar preview</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Open the full calendar for day / week / month views.
            </p>
            <Link
              href="/app/calendar"
              className="mt-3 inline-block rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Open calendar
            </Link>
          </div>
        </div>
      </div>

      <TaskForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        defaultDate={today}
        onCreated={() => void load()}
      />
    </div>
  );
}
