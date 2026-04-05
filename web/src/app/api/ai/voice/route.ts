import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const AI_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; default_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${AI_URL}/parse-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: body.text,
        default_date: body.default_date,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: "AI service error", detail: t },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Cannot reach AI service",
        hint: "Start FastAPI: cd ai-service && uvicorn main:app --reload --port 8000",
        detail: String(e),
      },
      { status: 503 }
    );
  }
}
