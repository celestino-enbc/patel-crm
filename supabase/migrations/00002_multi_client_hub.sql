-- Multi-client hub: Visor sees all requests; each client only sees their own.

create type public.client_kind as enum ('hub', 'client');
create type public.assignee_kind as enum ('hub', 'client');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind public.client_kind not null default 'client',
  notify_email text,
  created_at timestamptz not null default now(),
  constraint clients_hub_name_check check (
    (kind = 'hub' and slug = 'visor') or kind = 'client'
  )
);

create unique index clients_one_hub_idx
  on public.clients (kind)
  where kind = 'hub';

insert into public.clients (name, slug, kind, notify_email) values
  ('Visor', 'visor', 'hub', null),
  ('Two Sides', 'two-sides', 'client', null);

-- ---------------------------------------------------------------------------
-- Profiles → client_id
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column client_id uuid references public.clients (id) on delete restrict;

update public.profiles p
set client_id = c.id
from public.clients c
where (p.organization::text = 'visor' and c.slug = 'visor')
   or (p.organization::text = 'two_sides' and c.slug = 'two-sides');

alter table public.profiles
  alter column client_id set not null;

create index profiles_client_id_idx on public.profiles (client_id);

-- ---------------------------------------------------------------------------
-- Tasks → belong to a client; assignee is hub or that client
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column client_id uuid references public.clients (id) on delete restrict;

alter table public.tasks
  add column assignee_kind public.assignee_kind;

update public.tasks
set
  client_id = (select id from public.clients where slug = 'two-sides'),
  assignee_kind = case
    when assignee::text = 'visor' then 'hub'::public.assignee_kind
    else 'client'::public.assignee_kind
  end;

alter table public.tasks
  alter column client_id set not null;

alter table public.tasks
  alter column assignee_kind set not null;

create index tasks_client_id_idx on public.tasks (client_id);
create index tasks_assignee_kind_idx on public.tasks (assignee_kind);

alter table public.tasks drop column assignee;
drop index if exists public.tasks_assignee_idx;

alter table public.profiles drop column organization;
drop type public.organization;

-- ---------------------------------------------------------------------------
-- Auth trigger: metadata.client_id or metadata.client_slug
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_client uuid;
begin
  if coalesce(new.raw_user_meta_data->>'client_id', '') <> '' then
    resolved_client := (new.raw_user_meta_data->>'client_id')::uuid;
  elsif coalesce(new.raw_user_meta_data->>'client_slug', '') <> '' then
    select id into resolved_client
    from public.clients
    where slug = new.raw_user_meta_data->>'client_slug';
  elsif coalesce(new.raw_user_meta_data->>'organization', '') <> '' then
    select id into resolved_client
    from public.clients
    where slug = case new.raw_user_meta_data->>'organization'
      when 'two_sides' then 'two-sides'
      else new.raw_user_meta_data->>'organization'
    end;
  end if;

  if resolved_client is null then
    raise exception 'No se pudo asignar un cliente al nuevo usuario';
  end if;

  insert into public.profiles (id, email, full_name, client_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    resolved_client
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer to avoid recursive policies)
-- ---------------------------------------------------------------------------
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_hub()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.clients c on c.id = p.client_id
    where p.id = auth.uid()
      and c.kind = 'hub'
  )
$$;

grant execute on function public.current_client_id() to anon, authenticated;
grant execute on function public.is_hub() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Replace overly-open policies
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "tasks_select_authenticated" on public.tasks;
drop policy if exists "tasks_insert_authenticated" on public.tasks;
drop policy if exists "tasks_update_authenticated" on public.tasks;
drop policy if exists "task_attachments_select_authenticated" on public.task_attachments;
drop policy if exists "task_attachments_insert_authenticated" on public.task_attachments;
drop policy if exists "comments_select_authenticated" on public.comments;
drop policy if exists "comments_insert_authenticated" on public.comments;

alter table public.clients enable row level security;

create policy "clients_select_anyone"
  on public.clients for select
  using (true);

create policy "clients_insert_hub"
  on public.clients for insert
  to authenticated
  with check (public.is_hub() and kind = 'client');

create policy "clients_update_hub"
  on public.clients for update
  to authenticated
  using (public.is_hub())
  with check (public.is_hub());

create policy "profiles_select_scoped"
  on public.profiles for select
  to authenticated
  using (
    public.is_hub()
    or client_id = public.current_client_id()
    or exists (
      select 1 from public.clients c
      where c.id = profiles.client_id and c.kind = 'hub'
    )
  );

create policy "tasks_select_scoped"
  on public.tasks for select
  to authenticated
  using (public.is_hub() or client_id = public.current_client_id());

create policy "tasks_insert_scoped"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_hub()
      or client_id = public.current_client_id()
    )
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.kind = 'client'
    )
  );

create policy "tasks_update_scoped"
  on public.tasks for update
  to authenticated
  using (public.is_hub() or client_id = public.current_client_id())
  with check (public.is_hub() or client_id = public.current_client_id());

create policy "task_attachments_select_scoped"
  on public.task_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_hub() or t.client_id = public.current_client_id())
    )
  );

create policy "task_attachments_insert_scoped"
  on public.task_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_hub() or t.client_id = public.current_client_id())
    )
  );

create policy "comments_select_scoped"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_hub() or t.client_id = public.current_client_id())
    )
  );

create policy "comments_insert_scoped"
  on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_hub() or t.client_id = public.current_client_id())
    )
  );

drop policy if exists "evidencias_select_authenticated" on storage.objects;

create policy "evidencias_select_scoped"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      public.is_hub()
      or exists (
        select 1
        from public.task_attachments ta
        join public.tasks t on t.id = ta.task_id
        where ta.file_path = name
          and t.client_id = public.current_client_id()
      )
    )
  );
