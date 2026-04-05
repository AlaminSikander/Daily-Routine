"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TASK_CATEGORIES } from "@/lib/categories";
import type { TaskReminder } from "@/types/database";

const WEEKDAYS = [
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
  { v: 0, l: "Sun" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  onCreated: () => void;
};

export function TaskForm({ open, onClose, defaultDate, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("personal_tasks");
  const [scheduledDate, setScheduledDate] = useState(defaultDate ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [notes, setNotes] = useState("");
  const [repeatType, setRepeatType] = useState<string>("none");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [loading, setLoading] = useState(false);

  const [r10, setR10] = useState(true);
  const [r30, setR30] = useState(false);
  const [r60, setR60] = useState(false);
  const [persistent, setPersistent] = useState(false);

  if (!open) return null;

  function toggleWeekday(d: number) {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  }

  function buildReminders(): TaskReminder[] {
    const out: TaskReminder[] = [];
    if (r10) out.push({ kind: "before_start", minutes: 10, persistentUntilDone: persistent });
    if (r30) out.push({ kind: "before_start", minutes: 30, persistentUntilDone: persistent });
    if (r60) out.push({ kind: "before_start", minutes: 60, persistentUntilDone: persistent });
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (repeatType === "custom" && weekdays.length === 0) {
        throw new Error("Pick at least one weekday for custom repeat.");
      }
      const repeat_config =
        repeatType === "custom"
          ? { weekdays }
          : repeatType === "monthly"
            ? { monthlyDay: new Date(scheduledDate + "T12:00:00").getDate() }
            : {};
      const body = {
        title,
        category,
        scheduled_date: scheduledDate,
        start_time: startTime || null,
        end_time: endTime || null,
        priority,
        notes: notes || null,
        repeat_type: repeatType,
        repeat_config,
        starts_on: scheduledDate,
        reminders: buildReminders(),
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) {
        const msg =
          typeof j.error === "string"
            ? j.error
            : j.error?.message ?? JSON.stringify(j.error ?? "Save failed");
        throw new Error(msg);
      }
      setTitle("");
      setNotes("");
      toast.success(
        repeatType === "none" ? "Task saved" : "Recurring tasks saved"
      );
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">New task</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Close
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Date
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Start
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              End
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          </div>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Repeat
            <select
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (same weekday)</option>
              <option value="monthly">Monthly (same day of month)</option>
              <option value="custom">Custom weekdays</option>
            </select>
          </label>
          {repeatType === "custom" && (
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleWeekday(v)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    weekdays.includes(v)
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <fieldset className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <legend className="px-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Reminders (before start)
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r10} onChange={(e) => setR10(e.target.checked)} />
              10 minutes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r30} onChange={(e) => setR30(e.target.checked)} />
              30 minutes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r60} onChange={(e) => setR60(e.target.checked)} />
              1 hour
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={persistent}
                onChange={(e) => setPersistent(e.target.checked)}
              />
              Persistent until marked complete (browser notifications)
            </label>
          </fieldset>
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save task"}
          </button>
        </form>
      </div>
    </div>
  );
}
