"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
  return { success: true };
}
