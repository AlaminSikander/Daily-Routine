import type { TaskCategory } from "@/types/database";

export const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: "work_schedule", label: "Work schedule" },
  { value: "prayer_time", label: "Prayer time" },
  { value: "meals_diet", label: "Meals / diet" },
  { value: "exercise_gym", label: "Exercise / gym" },
  { value: "study_plan", label: "Study plan" },
  { value: "personal_tasks", label: "Personal tasks" },
  { value: "important_reminders", label: "Important reminders" },
];

export function categoryLabel(cat: TaskCategory): string {
  return TASK_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}
