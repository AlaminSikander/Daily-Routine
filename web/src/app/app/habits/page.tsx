"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { HabitRow } from "@/types/database";

function streakForHabit(logDates: string[]): { current: number; best: number } {
  const set = new Set(logDates);
  let current = 0;
  for (let i = 0; i < 400; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (set.has(d)) current += 1;
    else break;
  }
  let best = 0;
  let run = 0;
  const sorted = [...logDates].sort();
  let prev: Date | null = null;
  for (const s of sorted) {
    const dt = new Date(s + "T12:00:00");
    if (prev) {
      const diff = (dt.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) run += 1;
      else run = 1;
    } else run = 1;
    prev = dt;
    best = Math.max(best, run);
  }
  return { current, best };
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [logsByHabit, setLogsByHabit] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: h } = await supabase.from("habits").select("*").eq("active", true).order("created_at");
    setHabits((h as HabitRow[]) ?? []);
    const from = format(subDays(new Date(), 120), "yyyy-MM-dd");
    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, log_date, completed")
      .gte("log_date", from)
      .eq("completed", true);
    const map: Record<string, string[]> = {};
    for (const row of logs ?? []) {
      const id = row.habit_id as string;
      if (!map[id]) map[id] = [];
      map[id].push(row.log_date as string);
    }
    setLogsByHabit(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summaries = useMemo(() => {
    return habits.map((h) => {
      const dates = logsByHabit[h.id] ?? [];
      const s = streakForHabit(dates);
      return { habit: h, ...s, week: dates.filter((d) => d >= format(subDays(new Date(), 6), "yyyy-MM-dd")).length };
    });
  }, [habits, logsByHabit]);

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("habits").insert({
      user_id: user.id,
      name: name.trim(),
      category: "personal_tasks",
      target_per_week: 7,
    });
    setName("");
    void load();
  }

  async function logToday(habitId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase.from("habit_logs").upsert(
      {
        habit_id: habitId,
        user_id: user.id,
        log_date: today,
        completed: true,
      },
      { onConflict: "habit_id,log_date" }
    );
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Habits</h1>
        <p className="text-sm text-zinc-500">Streaks motivate consistency (7-day and best run).</p>
      </div>
      <form onSubmit={(e) => void addHabit(e)} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New habit (e.g. Fajr on time)"
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Add
        </button>
      </form>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {summaries.map(({ habit, current, best, week }) => (
            <li
              key={habit.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{habit.name}</p>
                <p className="text-xs text-zinc-500">
                  Current streak: {current}d · Best: {best}d · This week: {week}/{habit.target_per_week}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logToday(habit.id)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Log today
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
