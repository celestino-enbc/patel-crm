-- Patel CRM: schema, enums, RLS and storage for Visor / Two Sides

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.organization as enum ('visor', 'two_sides');

create type public.task_status as enum (
  'solicitado',
  'en_revision',
  'hecho',
  'quitar'
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  organization public.organization not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  status public.task_status not null default 'solicitado',
  assignee public.organization not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_status_idx on public.tasks (status);
create index tasks_assignee_idx on public.tasks (assignee);
create index tasks_category_id_idx on public.tasks (category_id);
create index tasks_created_at_idx on public.tasks (created_at desc);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  file_type text not null default '',
  file_size integer not null default 0,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index task_attachments_task_id_idx on public.task_attachments (task_id);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  content text not null,
  created_at timestamptz not null default now()
);

create index comments_task_id_idx on public.comments (task_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup (metadata: full_name, organization)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, organization)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(
      (new.raw_user_meta_data->>'organization')::public.organization,
      'visor'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_attachments enable row level security;
alter table public.comments enable row level security;

-- Authenticated users can read every profile (needed for comments/authors)
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated
  using (true);

create policy "tasks_select_authenticated"
  on public.tasks for select
  to authenticated
  using (true);

create policy "tasks_insert_authenticated"
  on public.tasks for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "tasks_update_authenticated"
  on public.tasks for update
  to authenticated
  using (true)
  with check (true);

create policy "task_attachments_select_authenticated"
  on public.task_attachments for select
  to authenticated
  using (true);

create policy "task_attachments_insert_authenticated"
  on public.task_attachments for insert
  to authenticated
  with check (uploaded_by = auth.uid());

create policy "task_attachments_delete_own"
  on public.task_attachments for delete
  to authenticated
  using (uploaded_by = auth.uid());

create policy "comments_select_authenticated"
  on public.comments for select
  to authenticated
  using (true);

create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: bucket evidencias
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy "evidencias_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidencias');

create policy "evidencias_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidencias' and auth.uid() is not null);

create policy "evidencias_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'evidencias' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed categories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug) values
  ('Cuenta de usuario', 'cuenta-de-usuario'),
  ('Checkout y pago', 'checkout-y-pago'),
  ('Producto y catálogo', 'producto-y-catalogo'),
  ('Formularios de contacto', 'formularios-de-contacto'),
  ('UI general y navegación', 'ui-general-y-navegacion');

-- ---------------------------------------------------------------------------
-- Realtime: comments thread
-- ---------------------------------------------------------------------------
alter table public.comments replica identity full;
alter publication supabase_realtime add table public.comments;
