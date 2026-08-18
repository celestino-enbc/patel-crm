import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !url ||
  !serviceRoleKey ||
  url.includes("YOUR_PROJECT") ||
  serviceRoleKey === "your_service_role_key"
) {
  console.error(`
No hay credenciales reales de Supabase. Completa .env.local y ejecuta:
  1. supabase/migrations/00001_init.sql
  2. supabase/migrations/00002_multi_client_hub.sql
  3. npm run seed
`);
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  {
    email: "visor@patel.local",
    password: "PatelVisor123!",
    fullName: "Equipo Visor",
    clientSlug: "visor",
  },
  {
    email: "twosides@patel.local",
    password: "PatelTwoSides123!",
    fullName: "Equipo Two Sides",
    clientSlug: "two-sides",
  },
];

const seedTasks = [
  {
    title: "Registro con correo: no llega el correo de confirmación",
    description: "Al registrarse con correo, el usuario no recibe el email de confirmación.",
    categorySlug: "cuenta-de-usuario",
    status: "hecho",
    assigneeKind: "hub",
    clientSlug: "two-sides",
  },
  {
    title: "Cálculo del costo de shipping con diferentes couriers",
    description: "Validar el cálculo de envío según courier seleccionado en checkout.",
    categorySlug: "checkout-y-pago",
    status: "en_revision",
    assigneeKind: "hub",
    clientSlug: "two-sides",
  },
  {
    title: "Imagen personalizada sobre el producto",
    description: "Permitir una imagen personalizada superpuesta en la ficha de producto.",
    categorySlug: "producto-y-catalogo",
    status: "solicitado",
    assigneeKind: "client",
    clientSlug: "two-sides",
  },
  {
    title: "¿Comparar? ¿Para qué sirve ese botón?",
    description: "El botón Comparar no tiene un propósito claro en la navegación.",
    categorySlug: "ui-general-y-navegacion",
    status: "quitar",
    assigneeKind: "hub",
    clientSlug: "two-sides",
  },
];

async function ensureUser(user, clientId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      client_id: clientId,
      client_slug: user.clientSlug,
    },
  });

  let authUser = data?.user;
  if (error || !authUser) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    authUser = list.users.find((item) => item.email === user.email);
    if (!authUser) {
      throw error ?? new Error(`No se pudo crear ni encontrar ${user.email}`);
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authUser.id,
    email: user.email,
    full_name: user.fullName,
    client_id: clientId,
  });
  if (profileError) throw profileError;

  return authUser;
}

async function main() {
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, slug");

  if (clientsError) {
    throw new Error(
      `${clientsError.message}\n¿Ejecutaste supabase/migrations/00002_multi_client_hub.sql?`
    );
  }

  const clientBySlug = new Map((clients ?? []).map((item) => [item.slug, item.id]));
  const visorClientId = clientBySlug.get("visor");
  const twoSidesClientId = clientBySlug.get("two-sides");

  if (!visorClientId || !twoSidesClientId) {
    throw new Error("Faltan los clientes Visor o Two Sides. Ejecuta 00002_multi_client_hub.sql.");
  }

  const visor = await ensureUser(demoUsers[0], visorClientId);
  await ensureUser(demoUsers[1], twoSidesClientId);

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug");
  if (categoryError) throw categoryError;

  const categoryBySlug = new Map((categories ?? []).map((item) => [item.slug, item.id]));

  for (const task of seedTasks) {
    const categoryId = categoryBySlug.get(task.categorySlug);
    const clientId = clientBySlug.get(task.clientSlug);
    if (!categoryId || !clientId) {
      throw new Error(`Falta categoría o cliente para: ${task.title}`);
    }

    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("title", task.title)
      .maybeSingle();

    if (existing) {
      console.log(`Ya existe: ${task.title}`);
      continue;
    }

    const { error } = await supabase.from("tasks").insert({
      title: task.title,
      description: task.description,
      category_id: categoryId,
      client_id: clientId,
      status: task.status,
      assignee_kind: task.assigneeKind,
      created_by: visor.id,
    });

    if (error) throw error;
    console.log(`Creada: ${task.title}`);
  }

  console.log("\nUsuarios de prueba:");
  console.log("  visor@patel.local / PatelVisor123!     → hub (ve todos los clientes)");
  console.log("  twosides@patel.local / PatelTwoSides123! → cliente Two Sides");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
