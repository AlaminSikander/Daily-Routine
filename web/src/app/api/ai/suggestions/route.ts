import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";
import { NextResponse } from "next/server";

const AI_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = format(subDays(new Date(), 13), "yyyy-MM-dd");
  const { data: tasks } = await supabase
    .from("tasks")
    .select("status, category, start_time, scheduled_date")
    .eq("user_id", user.id)
    .gte("scheduled_date", from);

  const list = tasks ?? [];
  const total = list.length;
  const completed = list.filter((t) => t.status === "completed").length;
  const completion_rate_7d = total ? completed / total : 1;

  let missed_study_after_hour: number | undefined;
  const studyMissed = list.filter(
    (t) => t.category === "study_plan" && t.status === "missed" && t.start_time
  );
  if (studyMissed.length) {
    const hours = studyMissed.map((t) => parseInt(String(t.start_time).slice(0, 2), 10));
    missed_study_after_hour = Math.max(...hours);
  }

  const gym = list.filter((t) => t.category === "exercise_gym");
  const gymWeekday = gym.filter((t) => {
    const d = new Date(t.scheduled_date + "T12:00:00");
    const wd = d.getDay();
    return wd >= 1 && wd <= 5;
  });
  const gym_weekday_rate =
    gym.length > 0 ? gymWeekday.filter((t) => t.status === "completed").length / gym.length : undefined;

  const payload = {
    completion_rate_7d,
    missed_study_after_hour,
    gym_weekday_rate,
    best_focus_window: "9 AM – 12 PM",
  };

  try {
    const res = await fetch(`${AI_URL}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return NextResponse.json({
        suggestions: [
          "Complete three high-priority tasks before noon to build momentum.",
        ],
        stats: payload,
      });
    }
    const data = await res.json();
    return NextResponse.json({ ...data, stats: payload });
  } catch {
    return NextResponse.json({
      suggestions: [
        "Start the AI service for personalized tips, or keep logging tasks to unlock better patterns.",
      ],
      stats: payload,
    });
  }
}
