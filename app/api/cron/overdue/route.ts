import { NextResponse } from "next/server";
import { flagOverdueTasks } from "@/app/actions/tasks";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await flagOverdueTasks();
  return NextResponse.json({ ok: true, ...result });
}
