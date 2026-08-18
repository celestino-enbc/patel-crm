"use server";

import { getCurrentProfile } from "@/app/actions/auth";
import { applyEachId } from "@/lib/bulk";
import { refreshDashboard } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, DirectoryPerson, HubMember, PersonStatus } from "@/lib/types";
import { PERSON_STATUSES } from "@/lib/types";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function asDirectoryPerson(row: Record<string, unknown>): DirectoryPerson {
  const client = unwrap(row.client as DirectoryPerson["client"] | DirectoryPerson["client"][]);
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name ?? ""),
    phone: (row.phone as string | null) ?? null,
    job_title: (row.job_title as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: (row.status as PersonStatus) ?? "active",
    client_id: String(row.client_id),
    created_at: String(row.created_at),
    client: client ?? { id: "", name: "Equipo", slug: "", kind: "client" },
  };
}

export async function getHubMembers(): Promise<HubMember[]> {
  const supabase = createClient();
  const { data: hub, error: hubError } = await supabase
    .from("clients")
    .select("id")
    .eq("kind", "hub")
    .maybeSingle();

  if (hubError) {
    throw new Error(hubError.message);
  }
  if (!hub) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, job_title, status")
    .eq("client_id", hub.id)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
  }));
}

export async function getDirectoryPeople(): Promise<DirectoryPerson[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, job_title, notes, status, client_id, created_at, client:clients (id, name, slug, kind)"
    )
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => asDirectoryPerson(row as Record<string, unknown>));
}

export async function createManualPerson(input: {
  clientId: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  jobTitle?: string;
  notes?: string;
  activateNow?: boolean;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede dar de alta personas." };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (fullName.length < 2) {
    return { success: false, error: "El nombre es obligatorio." };
  }
  if (!email.includes("@")) {
    return { success: false, error: "Ingresa un correo válido." };
  }
  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, archived_at")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client || client.archived_at) {
    return { success: false, error: "Selecciona un equipo o empresa válido." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      client_id: input.clientId,
      phone: input.phone?.trim() || "",
      job_title: input.jobTitle?.trim() || "",
      notes: input.notes?.trim() || "",
      status: input.activateNow ? "active" : "pending",
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function updatePersonContact(input: {
  id: string;
  fullName: string;
  phone?: string;
  jobTitle?: string;
  notes?: string;
}): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede editar contactos." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      job_title: input.jobTitle?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.id);

  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function setPersonStatus(
  id: string,
  status: PersonStatus
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede activar o desactivar cuentas." };
  }
  if (!(PERSON_STATUSES as readonly string[]).includes(status)) {
    return { success: false, error: "Estado inválido." };
  }
  if (id === profile.id && status !== "active") {
    return { success: false, error: "No puedes desactivar tu propia cuenta." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function setPeopleStatus(
  ids: string[],
  status: PersonStatus
): Promise<ActionResult<{ ok: number; failed: number }>> {
  return applyEachId(ids, (id) => setPersonStatus(id, status));
}

export async function deletePerson(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede eliminar personas." };
  }
  if (id === profile.id) {
    return { success: false, error: "No puedes eliminar tu propia cuenta." };
  }

  const supabase = createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, status, client:clients (kind)")
    .eq("id", id)
    .maybeSingle();

  const client = unwrap(target?.client as { kind: string } | { kind: string }[] | null);
  if (!target) {
    return { success: false, error: "No se encontró a esa persona." };
  }

  if (client?.kind === "hub") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("client_id", profile.client_id)
      .eq("status", "active")
      .neq("id", id);
    if ((count ?? 0) < 1 && target.status === "active") {
      return { success: false, error: "Debe quedar al menos un miembro activo de VisorLab." };
    }
  }

  const admin = createAdminClient();
  await admin.from("tasks").update({ created_by: profile.id }).eq("created_by", id);
  await admin.from("comments").update({ user_id: profile.id }).eq("user_id", id);
  await admin.from("task_attachments").update({ uploaded_by: profile.id }).eq("uploaded_by", id);
  await admin.from("invitations").update({ created_by: profile.id }).eq("created_by", id);

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return { success: false, error: error.message };
  }

  refreshDashboard();
  return { success: true };
}

export async function deletePeople(ids: string[]): Promise<ActionResult<{ ok: number; failed: number }>> {
  return applyEachId(ids, deletePerson);
}
