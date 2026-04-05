-- Track when user pressed "Start" so UI can show Start → Complete flow
alter table public.tasks
  add column if not exists started_at timestamptz;

comment on column public.tasks.started_at is 'Set when user starts the task; null until Start is pressed.';
