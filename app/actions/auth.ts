"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Profile } from "@/lib/types";

function mapProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null;
  const clientRaw = row.client as Profile["client"] | Profile["client"][] | null;
  const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;
  if (!client) return null;
  return { ...row, client } as Profile;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*, client:clients (*)")
    .eq("id", user.id)
    .single();

  return mapProfile(data as Record<string, unknown> | null);
}

export async function signIn(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { success: false, error: "Ingresa correo y contraseña." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Credenciales inválidas. Intenta de nuevo." };
  }

  redirect("/dashboard");
}

export async function signUp(): Promise<ActionResult> {
  return {
    success: false,
    error: "El registro abierto está desactivado. Usa un enlace de invitación de Visor.",
  };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
