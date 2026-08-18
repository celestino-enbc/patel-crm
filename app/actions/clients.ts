"use server";

import { revalidatePath } from "next/cache";
import { applyEachId, bulkPayload, normalizeIds } from "@/lib/bulk";
import { refreshDashboard } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugifyClientName, type ActionResult, type Client, type CreateClientInput, type UpdateClientInput } from "@/lib/types";
import { getCurrentProfile } from "@/app/actions/auth";

function asClient(row: unknown): Client {
  return row as Client;
}

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, slug, kind, notify_email, created_at, archived_at")
    .is("archived_at", null)
    .order("kind", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(asClient);
}

export async function getAdminCustomers(): Promise<Client[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, slug, kind, notify_email, created_at, archived_at")
    .eq("kind", "client")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(asClient);
}

export async function getCustomerClients(): Promise<Client[]> {
  const clients = await getClients();
  return clients.filter((client) => client.kind === "client");
}

export async function createCustomerClient(
  input: CreateClientInput
): Promise<ActionResult<Client>> {
  const name = input.name.trim();
  if (name.length < 2) {
    return { success: false, error: "El nombre del cliente es obligatorio." };
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede dar de alta clientes." };
  }

  const slug = slugifyClientName(name);
  if (!slug) {
    return { success: false, error: "El nombre no produce un identificador válido." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      slug,
      kind: "client",
      notify_email: input.notifyEmail?.trim() || null,
    })
    .select("id, name, slug, kind, notify_email, created_at, archived_at")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { success: false, error: "Ya existe un cliente con ese nombre." };
    }
    return { success: false, error: error?.message ?? "No se pudo crear el cliente." };
  }

  refreshDashboard();
  revalidatePath("/login");
  return { success: true, data: asClient(data) };
}

export async function updateCustomerClient(
  input: UpdateClientInput
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede editar clientes." };
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return { success: false, error: "El nombre del cliente es obligatorio." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      notify_email: input.notifyEmail?.trim() || null,
    })
    .eq("id", input.id)
    .eq("kind", "client");

  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function archiveCustomerClient(clientId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede archivar clientes." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("kind", "client");

  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function unarchiveCustomerClient(clientId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede restaurar clientes." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: null })
    .eq("id", clientId)
    .eq("kind", "client");

  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function archiveCustomerClients(
  ids: string[]
): Promise<ActionResult<{ ok: number; failed: number }>> {
  return setCustomersArchived(ids, new Date().toISOString());
}

export async function unarchiveCustomerClients(
  ids: string[]
): Promise<ActionResult<{ ok: number; failed: number }>> {
  return setCustomersArchived(ids, null);
}

async function setCustomersArchived(
  ids: string[],
  archivedAt: string | null
): Promise<ActionResult<{ ok: number; failed: number }>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede archivar clientes." };
  }

  const unique = normalizeIds(ids);
  if (unique.length === 0) return { success: false, error: "Selecciona al menos un registro." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ archived_at: archivedAt })
    .in("id", unique)
    .eq("kind", "client")
    .select("id");

  if (error) return { success: false, error: error.message };
  refreshDashboard();
  return bulkPayload(data?.length ?? 0, unique.length);
}

export async function deleteCustomerClient(clientId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede eliminar clientes." };
  }

  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, kind")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "client") {
    return { success: false, error: "No se puede eliminar esa cuenta." };
  }

  const [{ count: people }, { count: tasks }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);

  if ((people ?? 0) > 0 || (tasks ?? 0) > 0) {
    return {
      success: false,
      error: "Hay personas o peticiones ligadas. Muévelas o elimínalas antes.",
    };
  }

  const admin = createAdminClient();
  await admin.from("invitations").delete().eq("client_id", clientId);
  const { error } = await admin.from("clients").delete().eq("id", clientId).eq("kind", "client");
  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  revalidatePath("/login");
  return { success: true };
}

export async function deleteCustomerClients(
  ids: string[]
): Promise<ActionResult<{ ok: number; failed: number }>> {
  return applyEachId(ids, deleteCustomerClient);
}
