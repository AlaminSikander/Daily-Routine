"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { taskPatchHeaders } from "@/lib/task-timing-rules";
import type { TaskRow } from "@/types/database";

type Props = {
  task: TaskRow;
  onDone: () => void;
};

export function MissedRecoveryCard({ task, onDone }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy("…");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { ...taskPatchHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Task updated");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update task");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
        &quot;{task.title}&quot; was missed. Reschedule to stay organized?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            void patch({
              scheduled_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
              status: "pending",
              missed_recovery_prompted: true,
            })
          }
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          Tomorrow
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            void patch({
              scheduled_date: format(new Date(), "yyyy-MM-dd"),
              status: "pending",
              missed_recovery_prompted: true,
            })
          }
          className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50"
        >
          Later today
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void patch({ missed_recovery_prompted: true })}
          className="rounded-lg px-3 py-1.5 text-xs text-amber-800 underline dark:text-amber-200 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
