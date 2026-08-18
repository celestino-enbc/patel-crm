create type public.task_priority as enum ('low', 'medium', 'high');

alter table public.tasks
  add column if not exists priority public.task_priority not null default 'medium';

alter table public.tasks
  add column if not exists due_date timestamptz;

alter table public.tasks
  add column if not exists overdue_alerted_at timestamptz;

create index if not exists tasks_due_date_idx on public.tasks (due_date);
