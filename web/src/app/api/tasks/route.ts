import { createClient } from "@/lib/supabase/server";
import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findBlockingTimeConflict } from "@/lib/task-time-conflict";
import { generateOccurrenceDates } from "@/lib/recurrence";
import type { RepeatConfig, TaskReminder } from "@/types/database";

const taskCategory = z.enum([
  "work_schedule",
  "prayer_time",
  "meals_diet",
  "exercise_gym",
  "study_plan",
  "personal_tasks",
  "important_reminders",
]);

const repeatTypeEnum = z.enum(["none", "daily", "weekly", "monthly", "custom"]);

const repeatConfigSchema = z
  .object({
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    monthlyDay: z.number().int().min(1).max(31).optional(),
  })
  .optional();

const reminderSchema = z.object({
  kind: z.enum(["before_start", "before_end", "custom_time"]),
  minutes: z.number().optional(),
  time: z.string().optional(),
  persistentUntilDone: z.boolean().optional(),
});

const createBody = z.object({
  title: z.string().min(1),
  category: taskCategory,
  scheduled_date: z.string(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  notes: z.string().nullable().optional(),
  repeat_type: repeatTypeEnum.default("none"),
  repeat_config: repeatConfigSchema,
  starts_on: z.string().optional(),
  ends_on: z.string().nullable().optional(),
  reminders: z.array(reminderSchema).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const b = parsed.data;
  const repeatType = b.repeat_type;
  const repeatConfig = (b.repeat_config ?? {}) as RepeatConfig;
  const reminders = (b.reminders ?? []) as TaskReminder[];
  const startsOn = b.starts_on ?? b.scheduled_date;
  const until = b.ends_on ? new Date(b.ends_on) : addDays(new Date(), 90);

  const userId = user.id;

  async function loadPendingSlotsForDates(dates: string[]) {
    const unique = [...new Set(dates)];
    if (unique.length === 0) return [];
    const { data, error } = await supabase
      .from("tasks")
      .select("id, scheduled_date, start_time, end_time, status, title")
      .eq("user_id", userId)
      .eq("status", "pending")
      .in("scheduled_date", unique);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  if (repeatType === "none") {
    let existing: Awaited<ReturnType<typeof loadPendingSlotsForDates>> = [];
    try {
      existing = await loadPendingSlotsForDates([b.scheduled_date]);
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
    const clash = findBlockingTimeConflict(
      b.scheduled_date,
      b.start_time ?? null,
      b.end_time ?? null,
      existing
    );
    if (clash) {
      return NextResponse.json(
        {
          error: `That time overlaps “${clash.title}” on ${clash.scheduled_date} (${clash.start_time?.slice(0, 5) ?? "—"}).`,
          code: "TIME_CONFLICT",
          conflict: clash,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: b.title,
        category: b.category,
        scheduled_date: b.scheduled_date,
        start_time: b.start_time ?? null,
        end_time: b.end_time ?? null,
        priority: b.priority,
        notes: b.notes ?? null,
        reminders,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ task: data });
  }

  const { data: series, error: seriesError } = await supabase
    .from("task_series")
    .insert({
      user_id: userId,
      title: b.title,
      category: b.category,
      start_time: b.start_time ?? null,
      end_time: b.end_time ?? null,
      priority: b.priority,
      repeat_type: repeatType,
      repeat_config: repeatConfig,
      notes: b.notes ?? null,
      starts_on: startsOn,
      ends_on: b.ends_on ?? null,
      active: true,
    })
    .select()
    .single();

  if (seriesError || !series) {
    return NextResponse.json({ error: seriesError?.message ?? "Series failed" }, { status: 500 });
  }

  const dates = generateOccurrenceDates(repeatType, repeatConfig, startsOn, until, 120);

  let existingForSeries: Awaited<ReturnType<typeof loadPendingSlotsForDates>> = [];
  try {
    existingForSeries = await loadPendingSlotsForDates(dates);
  } catch (e) {
    await supabase.from("task_series").delete().eq("id", series.id);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  for (const d of dates) {
    const clash = findBlockingTimeConflict(
      d,
      b.start_time ?? null,
      b.end_time ?? null,
      existingForSeries
    );
    if (clash) {
      await supabase.from("task_series").delete().eq("id", series.id);
      return NextResponse.json(
        {
          error: `That time overlaps “${clash.title}” on ${clash.scheduled_date} (${clash.start_time?.slice(0, 5) ?? "—"}).`,
          code: "TIME_CONFLICT",
          conflict: clash,
        },
        { status: 409 }
      );
    }
  }

  const rows = dates.map((d) => ({
    user_id: userId,
    series_id: series.id,
    title: b.title,
    category: b.category,
    scheduled_date: d,
    start_time: b.start_time ?? null,
    end_time: b.end_time ?? null,
    priority: b.priority,
    notes: b.notes ?? null,
    reminders,
    status: "pending" as const,
  }));

  const { error: tasksError } = await supabase.from("tasks").insert(rows);
  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  return NextResponse.json({
    series,
    generated_until: format(until, "yyyy-MM-dd"),
    count: rows.length,
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let q = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false });

  if (from) q = q.gte("scheduled_date", from);
  if (to) q = q.lte("scheduled_date", to);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tasks: data });
}
