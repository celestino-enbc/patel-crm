# Alcances del proyecto — Patel CRM

Documento de alcance **hasta la fecha** (18 de agosto de 2026). Describe lo que el sistema ya cubre, cómo está modelado y qué queda fuera.

---

## 1. Propósito

Patel CRM es un **hub de seguimiento de peticiones** para el equipo **Visor**.

- Visor concentra en un solo tablero las peticiones de **todos** sus clientes.
- Cada cliente (el primero es **Two Sides**; se pueden dar de alta más) entra a **revisar, comentar y mover** solo lo de su cuenta.
- El flujo de trabajo es un Kanban con estados fijos: Solicitado → En revisión → Hecho, más la columna Quitar.

No es un CRM comercial genérico (no hay pipeline de ventas, facturación ni inventario). Es un tablero operativo de peticiones producto/UX entre Visor y sus clientes.

---

## 2. Actores y visibilidad

| Actor | Qué ve | Qué puede hacer |
| --- | --- | --- |
| **Visor (hub)** | Todas las peticiones de todos los clientes | Filtrar por cliente, crear peticiones asignadas a un cliente, dar de alta clientes, comentar, adjuntar evidencias, cambiar estado |
| **Cliente** (p. ej. Two Sides) | Solo las peticiones de su cuenta | Crear peticiones de su cuenta, comentar, adjuntar evidencias, cambiar estado de lo suyo |
| **Usuario no autenticado** | Solo la pantalla de login/registro | Iniciar sesión o crear cuenta eligiendo Visor o un cliente existente |

El aislamiento no es solo de interfaz: **Row Level Security (RLS)** en Supabase impide que un cliente lea o escriba peticiones de otro.

---

## 3. Alcance funcional incluido

### 3.1 Autenticación y perfiles

- Login con correo y contraseña (Supabase Auth).
- Registro con nombre, correo, contraseña y **equipo/cliente** (Visor o un cliente dado de alta).
- El perfil queda ligado a un registro de `clients` (hub o cliente).
- Sesión protegida por middleware: sin login se redirige a `/login`; con sesión, `/` va a `/dashboard`.
- Cierre de sesión desde el encabezado.

### 3.2 Hub multi-cliente

- Tabla `clients` con dos tipos: `hub` (único: Visor) y `client` (N clientes).
- Visor puede **dar de alta un cliente** (nombre + correo de avisos opcional).
- Two Sides nace como primer cliente en la migración `00002`.
- En el registro, la lista de equipos se carga desde la base (no está hardcodeada a dos valores).

### 3.3 Tablero Kanban (`/dashboard`)

Columnas:

| Estado | Uso |
| --- | --- |
| Solicitado | Petición nueva |
| En revisión | En análisis o en curso |
| Hecho | Resuelta |
| Quitar | Descartada o fuera de alcance |

Cada tarjeta muestra:

- Título
- Badge del **cliente** (solo en el hub Visor)
- Badge de **categoría**
- Tag de **responsable** (Visor o el cliente de esa petición)
- Contador de comentarios y de archivos

Comportamiento:

- Drag and drop entre columnas (`@hello-pangea/dnd`).
- El cambio de estado se persiste con Server Actions (actualización optimista + rollback si falla).
- Clic en la tarjeta abre el detalle.

Filtros superiores:

- Búsqueda por texto (título o descripción)
- Cliente (solo Visor)
- Categoría
- Responsable (Visor / Cliente)

### 3.4 Alta de peticiones

Modal con:

- Cliente (solo Visor; un usuario cliente queda fijado a su cuenta)
- Categoría (select)
- Título
- Descripción / notas
- Responsable: Visor o el cliente de la petición
- Dropzone de evidencias (JPG, PNG, WEBP, GIF, PDF · máx. 10 MB)

La petición nace siempre en **Solicitado**.

### 3.5 Detalle, evidencias y comentarios

Panel lateral (drawer) con:

- Datos completos (cliente, categoría, responsable, estado, autor, fecha)
- Galería de evidencias: vista previa de imágenes, listado de PDFs, descarga
- Posibilidad de adjuntar más archivos después de creada
- Hilo de comentarios con autor, badge de equipo y hora relativa
- Comentarios **en tiempo real** (Supabase Realtime) y alta mediante formulario

### 3.6 Correo transaccional

Envío con **Nodemailer** (SMTP Gmail o dominio propio).

Se notifica a la **contraparte de esa petición** (Visor ↔ el cliente dueño del ticket), no a un único “Two Sides” global, cuando:

1. Se crea una petición
2. El estado pasa a **En revisión** o **Hecho**
3. Se publica un comentario

El correo del hub usa `NOTIFY_VISOR_EMAIL` (o `clients.notify_email` de Visor). El del cliente usa `clients.notify_email` capturado al darlo de alta.

Si SMTP no está configurado, la operación de negocio **no se revierte**; el error de correo se registra en servidor.

### 3.7 Categorías iniciales

- Cuenta de usuario
- Checkout y pago
- Producto y catálogo
- Formularios de contacto
- UI general y navegación

### 3.8 Datos de prueba (seed)

Cuentas:

- `visor@patel.local` / `PatelVisor123!` — hub
- `twosides@patel.local` / `PatelTwoSides123!` — cliente Two Sides

Peticiones sembradas (todas del cliente Two Sides):

| Título | Categoría | Estado | Responsable |
| --- | --- | --- | --- |
| Registro con correo: no llega el correo de confirmación | Cuenta de usuario | Hecho | Visor |
| Cálculo del costo de shipping con diferentes couriers | Checkout y pago | En revisión | Visor |
| Imagen personalizada sobre el producto | Producto y catálogo | Solicitado | Cliente (Two Sides) |
| ¿Comparar? ¿Para qué sirve ese botón? | UI general y navegación | Quitar | Visor |

---

## 4. Modelo de datos (alcance de backend)

Tablas:

| Tabla | Rol |
| --- | --- |
| `clients` | Hub Visor + N clientes (nombre, slug, kind, correo de avisos) |
| `profiles` | 1:1 con `auth.users`; cada usuario pertenece a un `client` |
| `categories` | Catálogo de categorías |
| `tasks` | Petición: pertenece a un **cliente**; `assignee_kind` es `hub` o `client` |
| `task_attachments` | Metadatos y URL de evidencias |
| `comments` | Hilo por petición |

Almacenamiento:

- Bucket público `evidencias` (imágenes y PDF).
- Políticas de Storage: Visor lee todo; un cliente solo objetos ligados a peticiones de su cuenta.

Seguridad:

- RLS en `clients`, `profiles`, `tasks`, `task_attachments`, `comments`.
- Un cliente no lista tareas de otro cliente.
- Un cliente ve perfiles de su equipo y de Visor (para autores de comentarios).
- Solo Visor inserta filas `clients` con `kind = 'client'`.

Migraciones a ejecutar en Supabase, en orden:

1. `supabase/migrations/00001_init.sql` — schema base, Auth trigger, categorías, bucket
2. `supabase/migrations/00002_multi_client_hub.sql` — hub multi-cliente, RLS por tenant, mapeo de datos 1:1 Visor/Two Sides

---

## 5. Stack técnico en alcance

| Capa | Tecnología |
| --- | --- |
| App | Next.js 14 App Router, TypeScript, Server Actions |
| UI | Tailwind CSS, componentes estilo shadcn/ui, Lucide |
| Auth / DB / Storage / Realtime | Supabase |
| Kanban | `@hello-pangea/dnd` |
| Correo | Nodemailer (SMTP) |
| Idioma de interfaz | Español |

Operaciones de lectura/escritura de negocio van por Server Actions (`app/actions/`).

Rutas en alcance:

- `/` → redirige a `/dashboard`
- `/login` — acceso y registro
- `/dashboard` — tablero

---

## 6. Fuera de alcance (aún no construido)

Estos puntos **no** forman parte del producto actual:

- Roles finos dentro de un cliente o de Visor (admin, solo lectura, etc.)
- Invitaciones por correo / alta de usuarios gestionada solo por Visor (hoy el registro es abierto eligiendo equipo)
- Edición o baja de peticiones, clientes o categorías desde la UI
- Asignación a una persona concreta (solo Visor vs el cliente)
- SLA, fechas de entrega, prioridades o etiquetas extra
- Notificaciones in-app o push (solo correo SMTP)
- Adjuntos privados con URL firmada (el bucket es público; el listado sí está filtrado por RLS)
- Confirmación de email de Auth en el flujo de producto (en desarrollo se recomienda desactivarla)
- App móvil nativa, i18n, modo oscuro, ni panel de analítica
- Integración Resend aparte de SMTP (el envío es Nodemailer)
- Multi-hub (solo existe un hub: Visor)

---

## 7. Cómo se usa lo ya entregado

1. Ejecutar las dos migraciones SQL en el proyecto Supabase.
2. Completar `.env.local` (URL, anon key, service role, SMTP, `NOTIFY_VISOR_EMAIL`).
3. `npm run dev` y, si aplica, `npm run seed`.
4. Entrar como Visor para ver el hub completo; como Two Sides para ver solo su tablero.
5. Desde Visor, **Nuevo cliente** para ampliar el hub a más cuentas.

Detalle de instalación: `README.md`.
