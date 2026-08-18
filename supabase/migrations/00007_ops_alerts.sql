create table public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index ops_alerts_created_at_idx on public.ops_alerts (created_at desc);

alter table public.ops_alerts enable row level security;

create policy "ops_alerts_select_hub"
  on public.ops_alerts for select
  to authenticated
  using (public.is_hub());

create policy "ops_alerts_update_hub"
  on public.ops_alerts for update
  to authenticated
  using (public.is_hub())
  with check (public.is_hub());

-- Inserts go through the service role (SMTP/cron). Hub cannot forge alerts.
