"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/app/actions/auth";
import {
  buildInviteUrl,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isInvitationActive,
} from "@/lib/invitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface InvitationPreview {
  clientName: string;
  clientKind: "hub" | "client";
  email: string | null;
  expiresAt: string;
}

export interface InvitationRow {
  id: string;
  client_id: string;
  email: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  client: { id: string; name: string; slug: string; kind: "hub" | "client" };
}

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function createInvitation(input: {
  clientId: string;
  email?: string;
}): Promise<ActionResult<{ url: string; expiresAt: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede generar invitaciones." };
  }

  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, archived_at")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client) {
    return { success: false, error: "El cliente no existe." };
  }

  if (client.archived_at) {
    return { success: false, error: "No se puede invitar a un cliente archivado." };
  }

  const token = generateInvitationToken();
  const expiresAt = invitationExpiresAt().toISOString();
  const { error } = await supabase.from("invitations").insert({
    client_id: input.clientId,
    email: input.email?.trim() || null,
    token_hash: hashInvitationToken(token),
    expires_at: expiresAt,
    created_by: profile.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    data: {
      url: buildInviteUrl(token, appOrigin()),
      expiresAt,
    },
  };
}

export async function listInvitations(): Promise<InvitationRow[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, client_id, email, expires_at, used_at, created_at, client:clients (id, name, slug, kind)"
    )
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    return { ...row, client } as InvitationRow;
  });
}

export async function getInvitationPreview(
  token: string
): Promise<ActionResult<InvitationPreview>> {
  if (!token) {
    return { success: false, error: "Falta el enlace de invitación." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("email, expires_at, used_at, client:clients (name, kind)")
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Esta invitación no existe." };
  }

  if (!isInvitationActive({ expires_at: data.expires_at, used_at: data.used_at })) {
    return { success: false, error: "Esta invitación ya se usó o caducó." };
  }

  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  return {
    success: true,
    data: {
      clientName: client?.name ?? "Cliente",
      clientKind: client?.kind ?? "client",
      email: data.email,
      expiresAt: data.expires_at,
    },
  };
}

export async function signUpWithInvitation(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!token) {
    return { success: false, error: "Falta el enlace de invitación." };
  }
  if (!email || !password || !fullName) {
    return { success: false, error: "Completa nombre, correo y contraseña." };
  }
  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const preview = await getInvitationPreview(token);
  if (!preview.success || !preview.data) {
    return { success: false, error: preview.error ?? "Invitación inválida." };
  }

  if (preview.data.email && preview.data.email.toLowerCase() !== email.toLowerCase()) {
    return { success: false, error: `Usa el correo ${preview.data.email} para esta invitación.` };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      invitation_token: token,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { success: false, error: "Cuenta creada. Entra desde /login." };
  }

  redirect("/dashboard");
}
