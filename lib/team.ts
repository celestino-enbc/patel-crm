import type { HubMember } from "@/lib/types";

export type { HubMember };

export function normalizeAssigneeUserId(value: string | null | undefined): string | null {
  if (!value || value === "none" || value === "unassigned") return null;
  return value;
}

export function matchesResponsableFilter(
  assigneeUserId: string | null | undefined,
  filter: string
): boolean {
  if (filter === "all") return true;
  if (filter === "unassigned") return !assigneeUserId;
  return assigneeUserId === filter;
}

export function hubMemberLabel(
  member: Pick<HubMember, "full_name" | "email"> | null | undefined
): string {
  if (!member) return "Sin asignar";
  return member.full_name || member.email;
}
