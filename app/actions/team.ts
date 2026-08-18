"use server";

import { createClient } from "@/lib/supabase/server";
import type { HubMember } from "@/lib/types";

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
    .select("id, full_name, email")
    .eq("client_id", hub.id)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HubMember[];
}
