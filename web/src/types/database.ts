export type TaskCategory =
  | "work_schedule"
  | "prayer_time"
  | "meals_diet"
  | "exercise_gym"
  | "study_plan"
  | "personal_tasks"
  | "important_reminders";

export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "custom";

export type TaskStatus = "pending" | "completed" | "missed" | "cancelled";

export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "custom";

/** Weekday 0 = Sunday … 6 = Saturday (JS Date.getDay()) */
export type RepeatConfig = {
  weekdays?: number[];
  monthlyDay?: number;
};

export type TaskReminder = {
  kind: "before_start" | "before_end" | "custom_time";
  minutes?: number;
  time?: string;
  persistentUntilDone?: boolean;
};

export type TaskRow = {
  id: string;
  user_id: string;
  series_id: string | null;
  title: string;
  category: TaskCategory;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  priority: PriorityLevel;
  notes: string | null;
  status: TaskStatus;
  completed_at: string | null;
  reminders: TaskReminder[] | null;
  snooze_until: string | null;
  missed_recovery_prompted: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskSeriesRow = {
  id: string;
  user_id: string;
  title: string;
  category: TaskCategory;
  start_time: string | null;
  end_time: string | null;
  priority: PriorityLevel;
  repeat_type: RepeatType;
  repeat_config: RepeatConfig;
  notes: string | null;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: TaskCategory | null;
  target_per_week: number;
  color: string;
  active: boolean;
  created_at: string;
};

export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  period: GoalPeriod;
  deadline: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type JournalRow = {
  id: string;
  user_id: string;
  entry_date: string;
  achievements: string | null;
  lessons: string | null;
  tomorrow_plan: string | null;
  mood: number | null;
  created_at: string;
  updated_at: string;
};
