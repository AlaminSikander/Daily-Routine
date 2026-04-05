/** Minimum gap (minutes) between same-title tasks on the same day when both have a start time. */
export const SAME_TITLE_MIN_GAP_MINUTES = 15;

export type TaskSlotForGap = {
  id?: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  status?: string | null;
};

export function normalizeTaskTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function startTimeToMinutes(t: string | null | undefined): number | null {
  if (t == null || t === "") return null;
  const parts = String(t).split(":").map((x) => parseInt(x, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * If another **pending** task has the same title on the same date and start times
 * are **less than** `SAME_TITLE_MIN_GAP_MINUTES` apart, returns that task.
 * No check when `startTime` is missing (untimed tasks allowed freely).
 */
export function findSameTaskTooClose(
  existing: TaskSlotForGap[],
  title: string,
  scheduledDate: string,
  startTime: string | null | undefined,
  options?: { excludeTaskId?: string }
): TaskSlotForGap | null {
  if (startTime == null || startTime === "") return null;
  const newM = startTimeToMinutes(startTime);
  if (newM === null) return null;
  const norm = normalizeTaskTitle(title);
  if (!norm) return null;

  for (const t of existing) {
    if (t.scheduled_date !== scheduledDate) continue;
    if (options?.excludeTaskId && t.id === options.excludeTaskId) continue;
    const st = t.status ?? "pending";
    if (st !== "pending") continue;
    if (normalizeTaskTitle(t.title) !== norm) continue;
    const om = startTimeToMinutes(t.start_time);
    if (om === null) continue;
    const diff = Math.abs(newM - om);
    if (diff < SAME_TITLE_MIN_GAP_MINUTES) return t;
  }
  return null;
}
