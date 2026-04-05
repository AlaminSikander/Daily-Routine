import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findSameTaskTooClose } from "@/lib/task-same-title-gap";
import {
  completeTooSoonMessage,
  startTooEarlyMessage,
} from "@/lib/task-timing-rules";

const patchBody = z.object({
  status: z.enum(["pending", "completed", "missed", "cancelled"]).optional(),
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  scheduled_date: z.string().optional(),
  snooze_until: z.string().nullable().optional(),
  missed_recovery_prompted: z.boolean().optional(),
  /** Set when user taps Start; null clears (e.g. reopen). ISO timestamp string. */
  started_at: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: current, error: loadErr } = await supabase
    .from("tasks")
    .select("id, scheduled_date, start_time, end_time, status, title, started_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadErr || !current) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const mergedDate = parsed.data.scheduled_date ?? current.scheduled_date;
  const mergedStart =
    parsed.data.start_time !== undefined ? parsed.data.start_time : current.start_time;
  const mergedTitle = parsed.data.title ?? current.title;
  const mergedStatus = parsed.data.status ?? current.status;

  const scheduleFieldsChanging =
    parsed.data.scheduled_date !== undefined ||
    parsed.data.start_time !== undefined ||
    parsed.data.title !== undefined;

  const wantsComplete = parsed.data.status === "completed";
  const wantsStart =
    Object.prototype.hasOwnProperty.call(parsed.data, "started_at") &&
    typeof parsed.data.started_at === "string" &&
    parsed.data.started_at.length > 0;

  if (wantsComplete) {
    const msg = completeTooSoonMessage(current.started_at as string | null | undefined);
    if (msg) {
      return NextResponse.json({ error: msg, code: "COMPLETE_TOO_SOON" }, { status: 400 });
    }
  }

  if (wantsStart && !wantsComplete) {
    const tz = request.headers.get("x-timezone") ?? "UTC";
    const msg = startTooEarlyMessage(
      mergedDate,
      mergedStart as string | null | undefined,
      tz
    );
    if (msg) {
      return NextResponse.json({ error: msg, code: "START_TOO_EARLY" }, { status: 400 });
    }
  }

  if (
    scheduleFieldsChanging &&
    mergedStatus === "pending" &&
    mergedStart &&
    String(mergedStart).length > 0
  ) {
    const { data: others } = await supabase
      .from("tasks")
      .select("id, title, scheduled_date, start_time, status")
      .eq("user_id", user.id)
      .eq("scheduled_date", mergedDate)
      .eq("status", "pending");

    const clash = findSameTaskTooClose(
      others ?? [],
      mergedTitle,
      mergedDate,
      mergedStart as string,
      { excludeTaskId: id }
    );
    if (clash) {
      return NextResponse.json(
        {
          error: `Same task title on this day is already scheduled within 15 minutes (existing ${clash.start_time?.slice(0, 5) ?? "—"}).`,
          code: "SAME_TASK_TOO_CLOSE",
        },
        { status: 409 }
      );
    }
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (parsed.data.status === "completed") {
    updates.completed_at = new Date().toISOString();
    updates.started_at = null;
  }
  if (parsed.data.status === "pending") {
    updates.completed_at = null;
    if (current.status === "completed") {
      updates.started_at = null;
    }
  }
  if (parsed.data.status === "missed") {
    updates.started_at = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ task: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
