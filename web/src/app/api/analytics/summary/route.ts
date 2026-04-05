import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(7, Number(searchParams.get("days") ?? "7")));
  const from = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  const to = format(new Date(), "yyyy-MM-dd");

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("scheduled_date, status, category, start_time, end_time")
    .eq("user_id", user.id)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = tasks ?? [];
  const total = list.length;
  const completed = list.filter((t) => t.status === "completed").length;
  const missed = list.filter((t) => t.status === "missed").length;
  const pending = list.filter((t) => t.status === "pending").length;
  const completionRate = total ? completed / total : 0;

  const byCategory: Record<string, { total: number; done: number }> = {};
  for (const t of list) {
    const c = t.category as string;
    if (!byCategory[c]) byCategory[c] = { total: 0, done: 0 };
    byCategory[c].total += 1;
    if (t.status === "completed") byCategory[c].done += 1;
  }

  const byDay: Record<string, { total: number; done: number }> = {};
  for (const t of list) {
    const d = t.scheduled_date;
    if (!byDay[d]) byDay[d] = { total: 0, done: 0 };
    byDay[d].total += 1;
    if (t.status === "completed") byDay[d].done += 1;
  }

  const trend = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      completion_pct: v.total ? Math.round((100 * v.done) / v.total) : 0,
    }));

  return NextResponse.json({
    range_days: days,
    totals: { total, completed, missed, pending },
    completion_rate: Math.round(completionRate * 1000) / 1000,
    by_category: byCategory,
    trend,
  });
}
