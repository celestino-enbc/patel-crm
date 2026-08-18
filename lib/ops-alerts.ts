import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reportOperationalIssue(input: {
  kind: string;
  message: string;
  details?: Record<string, unknown>;
  error?: unknown;
}) {
  if (input.error) {
    Sentry.captureException(input.error, {
      tags: { kind: input.kind },
      extra: input.details,
    });
  } else {
    Sentry.captureMessage(input.message, {
      level: "error",
      tags: { kind: input.kind },
      extra: input.details,
    });
  }

  try {
    const admin = createAdminClient();
    await admin.from("ops_alerts").insert({
      kind: input.kind,
      message: input.message,
      details: input.details ?? {},
    });
  } catch (persistError) {
    console.error("No se pudo persistir ops_alert:", persistError);
    Sentry.captureException(persistError);
  }
}
