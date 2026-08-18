"use server";

import { refreshDashboard } from "@/lib/dashboard";
import { getCurrentProfile } from "@/app/actions/auth";
import { flagOverdueTasks } from "@/app/actions/tasks";
import { createClient } from "@/lib/supabase/server";
import type { OpsAlert } from "@/lib/types";

export async function getUnreadOpsAlerts(): Promise<OpsAlert[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("ops_alerts")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as OpsAlert[];
}

export async function markOpsAlertRead(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") return;
  const supabase = createClient();
  await supabase.from("ops_alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
  refreshDashboard();
}

export async function runOverdueCheck() {
  const profile = await getCurrentProfile();
  if (!profile || profile.client.kind !== "hub") return { count: 0 };
  return flagOverdueTasks();
}
