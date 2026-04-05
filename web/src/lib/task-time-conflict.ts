/** Minutes from midnight; supports "HH:MM" or "HH:MM:SS" from Postgres/time inputs. */
export function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (t == null || t === "") return null;
  const parts = String(t).split(":").map((x) => parseInt(x, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * Interval [lo, hi) in minutes from midnight for overlap checks.
 * No start time → null (no time-slot conflict; multiple untimed tasks allowed).
 * No end time → defaults to one hour after start.
 */
export function taskTimeInterval(
  start: string | null | undefined,
  end: string | null | undefined
): { lo: number; hi: number } | null {
  const lo = parseTimeToMinutes(start ?? null);
  if (lo === null) return null;
  const endM = parseTimeToMinutes(end ?? null);
  const hi = endM != null && endM > lo ? endM : lo + 60;
  return { lo, hi };
}

function intervalsOverlap(a: { lo: number; hi: number }, b: { lo: number; hi: number }): boolean {
  return a.lo < b.hi && b.lo < a.hi;
}

export type TaskSlot = {
  id?: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status?: string | null;
  title?: string | null;
};

/**
 * Returns an existing task that blocks this slot, or null.
 * Only `pending` tasks block; completed / missed / cancelled do not.
 */
export function findBlockingTimeConflict(
  scheduledDate: string,
  start: string | null | undefined,
  end: string | null | undefined,
  existing: TaskSlot[],
  options?: { excludeTaskId?: string }
): TaskSlot | null {
  const interval = taskTimeInterval(start, end);
  if (!interval) return null;

  const exclude = options?.excludeTaskId;

  for (const t of existing) {
    if (t.scheduled_date !== scheduledDate) continue;
    if (exclude && t.id === exclude) continue;
    const st = t.status ?? "pending";
    if (st !== "pending") continue;

    const other = taskTimeInterval(t.start_time, t.end_time);
    if (!other) continue;

    if (intervalsOverlap(interval, other)) return t;
  }
  return null;
}
