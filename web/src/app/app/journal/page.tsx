"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { JournalRow } from "@/types/database";

export default function JournalPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [achievements, setAchievements] = useState("");
  const [lessons, setLessons] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [mood, setMood] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("entry_date", date)
      .maybeSingle();
    const row = data as JournalRow | null;
    setAchievements(row?.achievements ?? "");
    setLessons(row?.lessons ?? "");
    setTomorrow(row?.tomorrow_plan ?? "");
    setMood(row?.mood ?? "");
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("journal_entries").upsert(
      {
        user_id: user.id,
        entry_date: date,
        achievements: achievements || null,
        lessons: lessons || null,
        tomorrow_plan: tomorrow || null,
        mood: mood === "" ? null : mood,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,entry_date" }
    );
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Journal</h1>
        <p className="text-sm text-zinc-500">Reflect, capture lessons, and prime tomorrow.</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            What I achieved today
            <textarea
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Lessons learned
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Tomorrow&apos;s plan
            <textarea
              value={tomorrow}
              onChange={(e) => setTomorrow(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Mood (1–5)
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white">
            Save entry
          </button>
        </form>
      )}
    </div>
  );
}
