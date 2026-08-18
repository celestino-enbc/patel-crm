export const SIGNED_URL_TTL_SECONDS = 120;

export function isOverdue(input: {
  due_date: string | null;
  status: string;
  archived_at?: string | null;
}): boolean {
  if (!input.due_date || input.archived_at) return false;
  if (input.status === "hecho" || input.status === "quitar") return false;
  return new Date(input.due_date).getTime() < Date.now();
}
