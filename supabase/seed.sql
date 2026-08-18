-- Seed de peticiones iniciales (requiere 00002 y al menos un perfil Visor).

do $$
declare
  visor_user uuid;
  two_sides uuid;
  category_cuenta uuid;
  category_checkout uuid;
  category_producto uuid;
  category_ui uuid;
begin
  select p.id into visor_user
  from public.profiles p
  join public.clients c on c.id = p.client_id
  where c.kind = 'hub'
  order by p.created_at
  limit 1;

  select id into two_sides from public.clients where slug = 'two-sides';

  if visor_user is null or two_sides is null then
    raise notice 'Ejecuta 00002_multi_client_hub.sql y crea un usuario Visor antes de sembrar.';
    return;
  end if;

  select id into category_cuenta from public.categories where slug = 'cuenta-de-usuario';
  select id into category_checkout from public.categories where slug = 'checkout-y-pago';
  select id into category_producto from public.categories where slug = 'producto-y-catalogo';
  select id into category_ui from public.categories where slug = 'ui-general-y-navegacion';

  insert into public.tasks (
    title, description, category_id, client_id, status, assignee_kind, created_by
  )
  select *
  from (
    values
      (
        'Registro con correo: no llega el correo de confirmación',
        'Al registrarse con correo, el usuario no recibe el email de confirmación.',
        category_cuenta,
        two_sides,
        'hecho'::public.task_status,
        'hub'::public.assignee_kind,
        visor_user
      ),
      (
        'Cálculo del costo de shipping con diferentes couriers',
        'Validar el cálculo de envío según courier seleccionado en checkout.',
        category_checkout,
        two_sides,
        'en_revision'::public.task_status,
        'hub'::public.assignee_kind,
        visor_user
      ),
      (
        'Imagen personalizada sobre el producto',
        'Permitir una imagen personalizada superpuesta en la ficha de producto.',
        category_producto,
        two_sides,
        'solicitado'::public.task_status,
        'client'::public.assignee_kind,
        visor_user
      ),
      (
        '¿Comparar? ¿Para qué sirve ese botón?',
        'El botón Comparar no tiene un propósito claro en la navegación.',
        category_ui,
        two_sides,
        'quitar'::public.task_status,
        'hub'::public.assignee_kind,
        visor_user
      )
  ) as seed(title, description, category_id, client_id, status, assignee_kind, created_by)
  where not exists (
    select 1 from public.tasks t where t.title = seed.title
  );
end $$;
