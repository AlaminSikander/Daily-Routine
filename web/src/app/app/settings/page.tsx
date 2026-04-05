"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [msg, setMsg] = useState<string | null>(null);

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setMsg("Notifications not supported in this browser.");
      return;
    }
    const p = await Notification.requestPermission();
    setMsg(`Permission: ${p}`);
  }

  async function runAutoPlan() {
    const res = await fetch("/api/tasks?from=" + new Date().toISOString().slice(0, 10));
    const j = await res.json();
    const blocks = (j.tasks as { title: string; start_time: string | null; category: string }[])?.map(
      (t) => ({
        title: t.title,
        start_time: t.start_time,
        category: t.category,
      })
    );
    const plan = await fetch("/api/ai/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    const pj = await plan.json();
    if (!plan.ok) setMsg(JSON.stringify(pj));
    else setMsg((pj.note as string) ?? "Schedule suggestion ready — check console");
    console.log("Auto plan", pj);
  }

  async function signOutEverywhere() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-500">Backup &amp; sync use Supabase; enable alerts for reminders.</p>
      </div>
      {msg && <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">{msg}</p>}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Allow browser notifications for time-based reminders (keep the tab open or install as PWA later).
        </p>
        <button
          type="button"
          onClick={() => void enableNotifications()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Enable notifications
        </button>
      </section>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Auto planning (AI)</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Sends today&apos;s tasks to the FastAPI service for a suggested ordering (see server logs).
        </p>
        <button
          type="button"
          onClick={() => void runAutoPlan()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Run auto plan
        </button>
      </section>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>
        <button
          type="button"
          onClick={() => void signOutEverywhere()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
