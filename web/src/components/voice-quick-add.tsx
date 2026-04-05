"use client";

import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { format } from "date-fns";

type Props = {
  onTasksParsed: (tasks: unknown[]) => void;
};

export function VoiceQuickAdd({ onTasksParsed }: Props) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function startListen() {
    setErr(null);
    if (typeof window === "undefined") return;
    type RecInstance = {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: Iterable<{ 0: { transcript: string } }> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const win = window as unknown as {
      SpeechRecognition?: new () => RecInstance;
      webkitSpeechRecognition?: new () => RecInstance;
    };
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SR) {
      setErr("Speech recognition not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const t = Array.from(ev.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      setText(t);
    };
    rec.onerror = () => setErr("Could not capture audio.");
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function parseAndCreate() {
    setErr(null);
    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text || "tomorrow gym at 6 PM and study at 9 PM",
          default_date: format(new Date(), "yyyy-MM-dd"),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? j.hint ?? "Voice API failed");
      const tasks = j.tasks as unknown[];
      onTasksParsed(tasks);
      setText("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Voice input</h3>
        <button
          type="button"
          onClick={() => (listening ? null : startListen())}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
        >
          {listening ? <Mic className="h-4 w-4 animate-pulse text-red-500" /> : <MicOff className="h-4 w-4" />}
          {listening ? "Listening…" : "Speak"}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Or type: “Tomorrow gym at 6 PM and study at 9 PM”"
        rows={2}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
      />
      {err && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</p>}
      <button
        type="button"
        onClick={() => void parseAndCreate()}
        className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Parse &amp; queue tasks
      </button>
    </div>
  );
}
