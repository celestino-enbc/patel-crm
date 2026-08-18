"use server";

import { refreshDashboard } from "@/lib/dashboard";
import { getCurrentProfile } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { slugifyClientName, type ActionResult, type Category } from "@/lib/types";

export async function getAllCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function createCategory(name: string): Promise<ActionResult<Category>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede crear categorías." };
  }

  const trimmed = name.trim();
  const slug = slugifyClientName(trimmed);
  if (!trimmed || !slug) {
    return { success: false, error: "El nombre de la categoría es obligatorio." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: trimmed, slug })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { success: false, error: "Ya existe una categoría con ese nombre." };
    }
    return { success: false, error: error?.message ?? "No se pudo crear." };
  }

  refreshDashboard();
  return { success: true, data: data as Category };
}

export async function updateCategory(
  id: string,
  name: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede editar categorías." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  refreshDashboard();
  return { success: true };
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo Visor puede archivar categorías." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  refreshDashboard();
  return { success: true };
}

export async function unarchiveCategory(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") {
    return { success: false, error: "Solo VisorLab puede restaurar categorías." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  refreshDashboard();
  return { success: true };
}
