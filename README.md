# Patel CRM

Hub de peticiones para **Visor**. Cada cliente entra a revisar solo lo suyo. El alta de usuarios es **por invitación**.

## Stack

- Next.js 14 App Router, TypeScript, Server Actions
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL, Auth, RLS, Storage privado, Realtime)
- `@hello-pangea/dnd`
- Nodemailer + Sentry

## Arranque local

1. En el SQL Editor de Supabase ejecuta, en orden:
   - `supabase/migrations/00001_init.sql`
   - `supabase/migrations/00002_multi_client_hub.sql`
   - `supabase/migrations/00003_invitations.sql`
   - `supabase/migrations/00004_private_evidencias.sql`
   - `supabase/migrations/00005_soft_delete.sql`
   - `supabase/migrations/00006_priority_due_date.sql`
   - `supabase/migrations/00007_ops_alerts.sql`
   - `supabase/migrations/00008_responsables.sql`
2. Copia `.env.example` a `.env.local` y completa al menos las variables **obligatorias en local**.
3. En Auth, desactiva *Confirm email*. Recomendado: desactivar el registro público de Auth (el alta pasa por invitación + service role).
4. `npm install && npm run dev`
5. `npm run seed` para usuarios demo.

Cuentas seed: `visor@patel.local` / `PatelVisor123!` y `twosides@patel.local` / `PatelTwoSides123!`.

Desde Visor: **Invitar** genera un enlace `/invite/{token}` (7 días).

## Variables de entorno

### Obligatorias para arrancar en local

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente browser/server con RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed, invitaciones (createUser), alertas, cron de vencidas |
| `NEXT_PUBLIC_APP_URL` | Origen de los enlaces de invitación (`http://localhost:3000`) |

Sin estas cuatro la app no autentica, no siembra y no emite invitaciones.

### Opcionales en local, necesarias en producción

| Variable | Uso |
| --- | --- |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Correo transaccional. En producción usa SMTP del **dominio propio** (no solo Gmail de desarrollo). |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Remitente visible |
| `NOTIFY_VISOR_EMAIL` | Fallback de avisos al hub |
| `CRON_SECRET` | Autoriza `GET /api/cron/overdue` (`Authorization: Bearer …`). Programa el cron cada hora. |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Errores de cliente y Server Actions. Los fallos SMTP también se muestran a Visor en el banner de alertas. |
| `SENTRY_AUTH_TOKEN` | Subida de source maps (opcional) |

Si SMTP no está configurado en local, las peticiones se guardan igual y Visor ve la alerta operativa.

## Tests

```bash
npm test          # invitaciones, signed URLs, vencidas; RLS si hay .env.local
npm run test:e2e  # Playwright: crear → mover → ver desde el cliente
```

## ¿Listo para MVP en Hetzner?

**A nivel de producto, sí.** El VPS es **MARLEY** (`77.42.78.96`). Ya hay **Caddy en el host** (80/443) y otra app Docker en `127.0.0.1:3000`. Patel convive como un backend más en `127.0.0.1:3010`; el Caddy de este repo **no** se arranca.

Antes de abrir a clientes reales:

1. Ejecuta **todas** las migraciones `00001`–`00007` en Supabase.
2. En Auth: desactiva *Confirm email* (o configura el flujo) y **desactiva el registro público**.
3. No uses las cuentas seed en producción; invita a Visor y a cada cliente.
4. DNS: `patel.visorlab.study` → `A` `77.42.78.96` (ya apuntado).
5. Completa SMTP de dominio propio y `NEXT_PUBLIC_APP_URL=https://patel.visorlab.study`.
6. Firewall: **22, 80, 443** (ya abierto).

Supabase sigue en la nube. MARLEY solo corre el contenedor Next.js.

## Despliegue en MARLEY

```bash
git clone https://github.com/celestino-enbc/patel-crm.git /home/patel-crm
cd /home/patel-crm
cp .env.example .env
nano .env
```

En `.env` de producción:

```
NEXT_PUBLIC_APP_URL=https://patel.visorlab.study
APP_PORT=3010
DOMAIN=patel.visorlab.study
CRON_SECRET=un-secreto-largo
```

```bash
docker compose up -d --build
```

Eso no toca 80/443. Después, añade el sitio al Caddy del host (`/etc/caddy/Caddyfile`; plantilla en `deploy/caddy-marley.conf`) y recarga:

```bash
systemctl reload caddy
```

Actualizar:

```bash
cd /home/patel-crm
git pull
docker compose up -d --build
```

