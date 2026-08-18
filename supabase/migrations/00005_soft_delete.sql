-- Soft delete + hub-managed categories.

alter table public.tasks add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.categories add column if not exists archived_at timestamptz;

create index if not exists tasks_archived_at_idx on public.tasks (archived_at);
create index if not exists clients_archived_at_idx on public.clients (archived_at);
create index if not exists categories_archived_at_idx on public.categories (archived_at);

drop policy if exists "categories_insert_hub" on public.categories;
drop policy if exists "categories_update_hub" on public.categories;

create policy "categories_insert_hub"
  on public.categories for insert
  to authenticated
  with check (public.is_hub());

create policy "categories_update_hub"
  on public.categories for update
  to authenticated
  using (public.is_hub())
  with check (public.is_hub());
