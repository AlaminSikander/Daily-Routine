import { fromZonedTime } from "date-fns-tz";

const FIVE_MIN_MS = 5 * 60 * 1000;

/** Earliest instant the user may press Start: 5 minutes before scheduled start (in `timeZone`). */
export function getScheduledStartMs(
  scheduledDate: string,
  startTime: string | null | undefined,
  timeZone: string
): number | null {
  if (!startTime) return null;
  const hm = startTime.slice(0, 5);
  const local = `${scheduledDate}T${hm}:00`;
  try {
    return fromZonedTime(local, timeZone).getTime();
  } catch {
    return null;
  }
}

/** Error message if start is too early; `null` if allowed. */
export function startTooEarlyMessage(
  scheduledDate: string,
  startTime: string | null | undefined,
  timeZone: string,
  nowMs: number = Date.now()
): string | null {
  const schedMs = getScheduledStartMs(scheduledDate, startTime, timeZone);
  if (schedMs === null) return null;
  const earliest = schedMs - FIVE_MIN_MS;
  if (nowMs < earliest) {
    return `You can start up to 5 minutes before the scheduled time (${startTime?.slice(0, 5)}).`;
  }
  return null;
}

/** Error message if complete is too soon after Start; `null` if allowed. */
export function completeTooSoonMessage(
  startedAtIso: string | null | undefined,
  nowMs: number = Date.now()
): string | null {
  if (!startedAtIso) return "Start the task before completing.";
  const t = new Date(startedAtIso).getTime();
  if (Number.isNaN(t)) return "Invalid start time.";
  if (nowMs < t + FIVE_MIN_MS) {
    const leftSec = Math.ceil((t + FIVE_MIN_MS - nowMs) / 1000);
    const m = Math.floor(leftSec / 60);
    const s = leftSec % 60;
    const wait = m > 0 ? `${m}m ${s}s` : `${s}s`;
    return `Wait ${wait} — complete is available 5 minutes after Start.`;
  }
  return null;
}

export function canStartTaskNow(
  task: { scheduled_date: string; start_time: string | null | undefined },
  timeZone: string,
  nowMs: number
): boolean {
  return startTooEarlyMessage(task.scheduled_date, task.start_time, timeZone, nowMs) === null;
}

export function canCompleteTaskNow(
  task: { started_at?: string | null },
  nowMs: number
): boolean {
  return completeTooSoonMessage(task.started_at, nowMs) === null;
}

/**
 * True when the scheduled slot is in the past (local wall time in `timeZone`).
 * With `start_time`: after that clock time on `scheduled_date`.
 * Without: after end of that calendar day in the zone.
 */
export function isScheduledTimeOver(
  task: { scheduled_date: string; start_time: string | null | undefined },
  timeZone: string,
  nowMs: number
): boolean {
  if (task.start_time) {
    const ms = getScheduledStartMs(task.scheduled_date, task.start_time, timeZone);
    if (ms === null) return false;
    return nowMs > ms;
  }
  try {
    const endOfDay = fromZonedTime(`${task.scheduled_date}T23:59:59`, timeZone).getTime();
    return nowMs > endOfDay;
  } catch {
    return false;
  }
}

export function taskPatchHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-timezone": typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  };
}
