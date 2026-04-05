import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import type { RepeatConfig, RepeatType } from "@/types/database";

export function shouldOccurOnDate(
  repeatType: RepeatType,
  config: RepeatConfig,
  anchor: Date,
  day: Date
): boolean {
  const d = startOfDay(day);
  const a = startOfDay(anchor);
  if (isBefore(d, a)) return false;

  switch (repeatType) {
    case "none":
      return isSameDay(d, a);
    case "daily":
      return true;
    case "weekly":
      return getDay(d) === getDay(a);
    case "monthly": {
      const target = config.monthlyDay ?? a.getDate();
      return d.getDate() === target;
    }
    case "custom": {
      const weekdays = config.weekdays ?? [];
      return weekdays.includes(getDay(d));
    }
    default:
      return false;
  }
}

export function generateOccurrenceDates(
  repeatType: RepeatType,
  config: RepeatConfig,
  startsOn: string,
  until: Date,
  maxDays = 120
): string[] {
  const start = startOfDay(parseISO(startsOn));
  const end = startOfDay(until);
  if (isBefore(end, start)) return [];

  const intervalEnd =
    eachDayOfInterval({ start, end }).length > maxDays
      ? addDays(start, maxDays - 1)
      : end;

  const days = eachDayOfInterval({ start, end: intervalEnd });
  const out: string[] = [];

  for (const day of days) {
    if (shouldOccurOnDate(repeatType, config, start, day)) {
      out.push(format(day, "yyyy-MM-dd"));
    }
  }

  return out;
}

/** Next suggested dates for monthly when day 31 doesn't exist */
export function clampMonthlyDay(year: number, monthIndex: number, day: number): Date {
  const last = endOfMonth(new Date(year, monthIndex, 1));
  const d = Math.min(day, last.getDate());
  return new Date(year, monthIndex, d);
}

export function addMonthsSafe(from: Date, months: number, preferredDay: number): Date {
  const t = addMonths(from, months);
  return clampMonthlyDay(t.getFullYear(), t.getMonth(), preferredDay);
}
