-- Personas del directorio: contacto + estado (invitación o alta manual).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'person_status') then
    create type public.person_status as enum ('pending', 'active', 'disabled');
  end if;
end $$;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists notes text,
  add column if not exists status public.person_status not null default 'active';

create index if not exists profiles_status_idx on public.profiles (status);

drop policy if exists "profiles_update_hub" on public.profiles;
create policy "profiles_update_hub"
  on public.profiles for update
  to authenticated
  using (public.is_hub())
  with check (public.is_hub());

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
  resolved_status public.person_status;
begin
  raw_token := coalesce(new.raw_user_meta_data->>'invitation_token', '');
  resolved_status := coalesce(nullif(new.raw_user_meta_data->>'status', '')::public.person_status, 'active');

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
    resolved_status := 'active';

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

  insert into public.profiles (
    id, email, full_name, client_id, phone, job_title, notes, status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    resolved_client,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'job_title', ''),
    nullif(new.raw_user_meta_data->>'notes', ''),
    resolved_status
  );

  if invitation_row.id is not null then
    update public.invitations
    set used_at = now(), used_by = new.id
    where id = invitation_row.id;
  end if;

  return new;
end;
$$;
