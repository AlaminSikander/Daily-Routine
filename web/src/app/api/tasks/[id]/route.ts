import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findBlockingTimeConflict } from "@/lib/task-time-conflict";

const patchBody = z.object({
  status: z.enum(["pending", "completed", "missed", "cancelled"]).optional(),
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  scheduled_date: z.string().optional(),
  snooze_until: z.string().nullable().optional(),
  missed_recovery_prompted: z.boolean().optional(),
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
    .select("id, scheduled_date, start_time, end_time, status, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadErr || !current) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const mergedDate = parsed.data.scheduled_date ?? current.scheduled_date;
  const mergedStart =
    parsed.data.start_time !== undefined ? parsed.data.start_time : current.start_time;
  const mergedEnd = parsed.data.end_time !== undefined ? parsed.data.end_time : current.end_time;

  const effectiveStatus = parsed.data.status ?? current.status;
  if (effectiveStatus === "pending") {
    const { data: others } = await supabase
      .from("tasks")
      .select("id, scheduled_date, start_time, end_time, status, title")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("scheduled_date", mergedDate);

    const clash = findBlockingTimeConflict(
      mergedDate,
      mergedStart,
      mergedEnd,
      others ?? [],
      { excludeTaskId: id }
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
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (parsed.data.status === "completed") {
    updates.completed_at = new Date().toISOString();
  }
  if (parsed.data.status === "pending") {
    updates.completed_at = null;
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
