"""
FastAPI AI helpers for Daily Life app.
Run: uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Daily Life AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VoiceParseRequest(BaseModel):
    text: str = Field(..., min_length=1)
    default_date: str | None = Field(
        default=None, description="ISO date yyyy-mm-dd anchor for 'tomorrow'"
    )


class SuggestRequest(BaseModel):
    completion_rate_7d: float | None = None
    missed_study_after_hour: int | None = None
    gym_weekday_rate: float | None = None
    best_focus_window: str | None = None


class ScheduleRequest(BaseModel):
    blocks: list[dict[str, Any]] = Field(default_factory=list)


def _parse_relative_day(text: str, anchor: datetime) -> datetime:
    t = text.lower()
    if "tomorrow" in t:
        return anchor + timedelta(days=1)
    if "today" in t:
        return anchor
    return anchor + timedelta(days=1)


def _extract_hour_minute(text: str) -> tuple[int, int] | None:
    """Best-effort 12h/24h time from free text."""
    t = text.lower()
    m = re.search(
        r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2}):(\d{2})\b", t
    )
    if not m:
        return None
    if m.group(3):
        h = int(m.group(1))
        minute = int(m.group(2) or 0)
        ap = m.group(3)
        if ap == "pm" and h != 12:
            h += 12
        if ap == "am" and h == 12:
            h = 0
        return h, minute
    h = int(m.group(4))
    minute = int(m.group(5))
    return h, minute


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse-voice")
def parse_voice(body: VoiceParseRequest):
    """Rule-based extraction; extend with OpenAI when API key is set."""
    anchor = datetime.utcnow()
    if body.default_date:
        try:
            anchor = datetime.strptime(body.default_date, "%Y-%m-%d")
        except ValueError:
            pass
    day = _parse_relative_day(body.text, anchor)
    date_str = day.strftime("%Y-%m-%d")
    tasks: list[dict[str, Any]] = []
    lower = body.text.lower()
    tm = _extract_hour_minute(body.text)

    def add_task(title: str, category: str, default_h: int, default_m: int):
        h, m = tm if tm else (default_h, default_m)
        tasks.append(
            {
                "title": title.strip().title(),
                "category": category,
                "scheduled_date": date_str,
                "start_time": f"{h:02d}:{m:02d}",
                "priority": "medium",
                "repeat_type": "none",
            }
        )

    if "gym" in lower:
        add_task("Gym", "exercise_gym", 18, 0)
    if "study" in lower:
        add_task("Study", "study_plan", 21, 0)
    if "fajr" in lower or "prayer" in lower:
        add_task("Prayer", "prayer_time", 5, 0)
    if not tasks:
        add_task("Personal task", "personal_tasks", 9, 0)

    return {"tasks": tasks, "source": "heuristic"}


@app.post("/suggestions")
def suggestions(body: SuggestRequest):
    tips: list[str] = []
    if body.completion_rate_7d is not None and body.completion_rate_7d < 0.6:
        tips.append("Your completion rate dipped this week — try shorter tasks and fixed time blocks.")
    if body.missed_study_after_hour and body.missed_study_after_hour >= 22:
        tips.append("You often miss study time after 10 PM — schedule study before dinner when possible.")
    if body.gym_weekday_rate is not None and body.gym_weekday_rate > 0.65:
        tips.append("Gym consistency is stronger on weekdays — keep anchors on Mon/Wed/Fri.")
    if body.best_focus_window:
        tips.append(f"Protected focus window: {body.best_focus_window}. Guard it from notifications.")
    if not tips:
        tips.append(
            "Log tasks at the same time each morning to build a planning habit."
        )
    return {"suggestions": tips}


@app.post("/schedule")
def auto_schedule(body: ScheduleRequest):
    """Return ordered blocks — client merges with fixed prayer/meals if needed."""
    blocks = sorted(
        body.blocks,
        key=lambda b: (b.get("start_time") or "99:99", b.get("title") or ""),
    )
    return {"ordered": blocks, "note": "Prioritize fixed rituals, then deep work, then flexible tasks."}


class MissedBody(BaseModel):
    task_title: str = "Task"


@app.post("/missed-recovery")
def missed_recovery(body: MissedBody):
    t = body.task_title
    return {
        "message": f'"{t}" was missed. Would you like to reschedule it?',
        "actions": ["reschedule_tomorrow", "reschedule_today_later", "dismiss"],
    }
