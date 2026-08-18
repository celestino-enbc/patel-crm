-- Responsable interno de VisorLab: una persona del hub atiende la petición.

alter table public.tasks
  add column if not exists assignee_user_id uuid references public.profiles (id) on delete set null;

create index if not exists tasks_assignee_user_id_idx
  on public.tasks (assignee_user_id);

create or replace function public.validate_task_assignee_user()
returns trigger
language plpgsql
as $$
begin
  if new.assignee_user_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.clients c on c.id = p.client_id
    where p.id = new.assignee_user_id
      and c.kind = 'hub'
  ) then
    raise exception 'El responsable debe ser un miembro de VisorLab';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_assignee_user_is_hub on public.tasks;

create trigger tasks_assignee_user_is_hub
  before insert or update of assignee_user_id
  on public.tasks
  for each row
  execute function public.validate_task_assignee_user();
