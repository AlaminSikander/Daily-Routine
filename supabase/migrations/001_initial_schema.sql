-- Daily Life productivity app — run in Supabase SQL editor or via CLI
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Categories aligned with product spec
create type public.task_category as enum (
  'work_schedule',
  'prayer_time',
  'meals_diet',
  'exercise_gym',
  'study_plan',
  'personal_tasks',
  'important_reminders'
);

create type public.repeat_type as enum (
  'none',
  'daily',
  'weekly',
  'monthly',
  'custom'
);

create type public.task_status as enum (
  'pending',
  'completed',
  'missed',
  'cancelled'
);

create type public.priority_level as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type public.goal_period as enum (
  'daily',
  'weekly',
  'monthly',
  'custom'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  notification_settings jsonb default '{"enabled": true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recurring series (template)
create table public.task_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category public.task_category not null,
  start_time time,
  end_time time,
  priority public.priority_level default 'medium',
  repeat_type public.repeat_type not null default 'none',
  repeat_config jsonb default '{}'::jsonb,
  notes text,
  starts_on date not null,
  ends_on date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Concrete task occurrences (one-off has series_id null)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id uuid references public.task_series (id) on delete set null,
  title text not null,
  category public.task_category not null,
  scheduled_date date not null,
  start_time time,
  end_time time,
  priority public.priority_level default 'medium',
  notes text,
  status public.task_status default 'pending',
  completed_at timestamptz,
  reminders jsonb default '[]'::jsonb,
  snooze_until timestamptz,
  missed_recovery_prompted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index tasks_user_date_idx on public.tasks (user_id, scheduled_date);
create index tasks_user_status_idx on public.tasks (user_id, status);
create index task_series_user_idx on public.task_series (user_id);

-- Habits
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  category public.task_category,
  target_per_week int default 7,
  color text default '#6366f1',
  active boolean default true,
  created_at timestamptz default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  completed boolean default true,
  note text,
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);

-- Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  target_value numeric,
  current_value numeric default 0,
  unit text,
  period public.goal_period default 'weekly',
  deadline date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Journal
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  achievements text,
  lessons text,
  tomorrow_plan text,
  mood int check (mood is null or (mood >= 1 and mood <= 5)),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);

-- Cached AI suggestions (optional)
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insight_type text not null,
  content jsonb not null,
  created_at timestamptz default now()
);

create index ai_insights_user_idx on public.ai_insights (user_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.task_series enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.ai_insights enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "task_series_own" on public.task_series for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs_own" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal_own" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_insights_own" on public.ai_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- New user profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
