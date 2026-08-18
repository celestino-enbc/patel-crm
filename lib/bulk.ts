import type { ActionResult } from "@/lib/types";

export function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0))).slice(
    0,
    100
  );
}

export function emptySelectionResult(): ActionResult<{ ok: number; failed: number }> {
  return { success: false, error: "Selecciona al menos un registro." };
}

export function bulkPayload(
  ok: number,
  requested: number,
  fallbackError = "No se pudo completar la acción."
): ActionResult<{ ok: number; failed: number }> {
  if (requested === 0) return emptySelectionResult();
  if (ok === 0) return { success: false, error: fallbackError };
  return { success: true, data: { ok, failed: requested - ok } };
}

export async function applyEachId(
  ids: string[],
  fn: (id: string) => Promise<ActionResult>
): Promise<ActionResult<{ ok: number; failed: number }>> {
  const unique = normalizeIds(ids);
  if (unique.length === 0) return emptySelectionResult();

  let ok = 0;
  let lastError: string | undefined;
  for (const id of unique) {
    const result = await fn(id);
    if (result.success) ok += 1;
    else lastError = result.error;
  }

  return bulkPayload(ok, unique.length, lastError);
}
