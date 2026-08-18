import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anon && service && !url.includes("YOUR_PROJECT"));

describe.skipIf(!configured)("RLS: cliente A no accede a tareas de cliente B", () => {
  it("impide select e insert cruzados", async () => {
    const admin = createClient(url!, service!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stamp = Date.now();
    const { data: clientA, error: clientAError } = await admin
      .from("clients")
      .insert({ name: `Cliente A ${stamp}`, slug: `cliente-a-${stamp}`, kind: "client" })
      .select("id")
      .single();
    const { data: clientB, error: clientBError } = await admin
      .from("clients")
      .insert({ name: `Cliente B ${stamp}`, slug: `cliente-b-${stamp}`, kind: "client" })
      .select("id")
      .single();
    expect(clientAError).toBeNull();
    expect(clientBError).toBeNull();

    const password = "TestClient123!";
    const userA = await admin.auth.admin.createUser({
      email: `a-${stamp}@patel.test`,
      password,
      email_confirm: true,
      user_metadata: { full_name: "User A", client_id: clientA!.id },
    });
    const userB = await admin.auth.admin.createUser({
      email: `b-${stamp}@patel.test`,
      password,
      email_confirm: true,
      user_metadata: { full_name: "User B", client_id: clientB!.id },
    });
    expect(userA.error).toBeNull();
    expect(userB.error).toBeNull();

    const { data: category } = await admin.from("categories").select("id").limit(1).single();
    const { data: taskB, error: taskError } = await admin
      .from("tasks")
      .insert({
        title: `Secreta B ${stamp}`,
        description: "no debe verse",
        category_id: category!.id,
        client_id: clientB!.id,
        assignee_kind: "hub",
        created_by: userB.data.user!.id,
        status: "solicitado",
      })
      .select("id")
      .single();
    expect(taskError).toBeNull();

    const asA = createClient(url!, anon!);
    const signed = await asA.auth.signInWithPassword({
      email: `a-${stamp}@patel.test`,
      password,
    });
    expect(signed.error).toBeNull();

    const { data: visible } = await asA.from("tasks").select("id").eq("id", taskB!.id);
    expect(visible ?? []).toHaveLength(0);

    const { error: writeError } = await asA.from("tasks").insert({
      title: "Intrusión",
      description: "",
      category_id: category!.id,
      client_id: clientB!.id,
      assignee_kind: "hub",
      created_by: userA.data.user!.id,
      status: "solicitado",
    });
    expect(writeError).not.toBeNull();
  });
});
