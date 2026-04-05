"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GoalRow } from "@/types/database";

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("hours");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("goals").select("*").eq("active", true).order("created_at", { ascending: false });
    setGoals((data as GoalRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !title.trim()) return;
    const tv = target ? parseFloat(target) : null;
    await supabase.from("goals").insert({
      user_id: user.id,
      title: title.trim(),
      target_value: tv,
      current_value: 0,
      unit,
      period: "weekly",
      active: true,
    });
    setTitle("");
    setTarget("");
    void load();
  }

  async function bump(g: GoalRow, delta: number) {
    const supabase = createClient();
    const next = (g.current_value ?? 0) + delta;
    await supabase.from("goals").update({ current_value: next, updated_at: new Date().toISOString() }).eq("id", g.id);
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Goals</h1>
        <p className="text-sm text-zinc-500">Long-term targets with simple progress tracking.</p>
      </div>
      <form onSubmit={(e) => void addGoal(e)} className="grid gap-3 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title (e.g. Study 3h daily)"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 sm:col-span-2"
        />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target number (optional)"
          type="number"
          step="0.1"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white sm:col-span-2"
        >
          Add goal
        </button>
      </form>
      <ul className="space-y-3">
        {goals.map((g) => {
          const pct =
            g.target_value && g.target_value > 0
              ? Math.min(100, Math.round(((g.current_value ?? 0) / g.target_value) * 100))
              : null;
          return (
            <li
              key={g.id}
              className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{g.title}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void bump(g, 1)}
                    className="rounded-lg bg-zinc-200 px-2 py-1 text-xs dark:bg-zinc-800"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => void bump(g, -1)}
                    className="rounded-lg bg-zinc-200 px-2 py-1 text-xs dark:bg-zinc-800"
                  >
                    −1
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Progress: {g.current_value ?? 0}
                {g.target_value != null ? ` / ${g.target_value}` : ""} {g.unit}
                {pct != null ? ` · ${pct}%` : ""}
              </p>
              {pct != null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
