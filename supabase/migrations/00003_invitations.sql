-- Invitations: Visor issues a time-limited link; signup is bound to that client.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  email text,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invitations_client_id_idx on public.invitations (client_id);
create index invitations_token_hash_idx on public.invitations (token_hash);

alter table public.invitations enable row level security;

create policy "invitations_select_hub"
  on public.invitations for select
  to authenticated
  using (public.is_hub());

create policy "invitations_insert_hub"
  on public.invitations for insert
  to authenticated
  with check (public.is_hub() and created_by = auth.uid());

create policy "invitations_update_hub"
  on public.invitations for update
  to authenticated
  using (public.is_hub())
  with check (public.is_hub());

-- Signup must consume a valid invitation token. Seed/admin may still pass client_id.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resolved_client uuid;
  invitation_row public.invitations%rowtype;
  raw_token text;
  hashed_token text;
begin
  raw_token := coalesce(new.raw_user_meta_data->>'invitation_token', '');

  if raw_token <> '' then
    hashed_token := encode(digest(raw_token, 'sha256'), 'hex');

    select * into invitation_row
    from public.invitations
    where token_hash = hashed_token
      and used_at is null
      and expires_at > now()
    for update;

    if invitation_row.id is null then
      raise exception 'Invitación inválida, usada o expirada';
    end if;

    resolved_client := invitation_row.client_id;

    if invitation_row.email is not null
       and lower(invitation_row.email) <> lower(new.email) then
      raise exception 'Esta invitación está reservada para otro correo';
    end if;
  elsif coalesce(new.raw_user_meta_data->>'client_id', '') <> '' then
    resolved_client := (new.raw_user_meta_data->>'client_id')::uuid;
  elsif coalesce(new.raw_user_meta_data->>'client_slug', '') <> '' then
    select id into resolved_client
    from public.clients
    where slug = new.raw_user_meta_data->>'client_slug';
  end if;

  if resolved_client is null then
    raise exception 'Se requiere una invitación válida para crear la cuenta';
  end if;

  insert into public.profiles (id, email, full_name, client_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    resolved_client
  );

  if invitation_row.id is not null then
    update public.invitations
    set used_at = now(), used_by = new.id
    where id = invitation_row.id;
  end if;

  return new;
end;
$$;
