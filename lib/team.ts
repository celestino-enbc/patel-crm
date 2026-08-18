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

export function isPersonActive(status: string | null | undefined): boolean {
  return status === "active" || status == null;
}

export function personStatusLabel(status: string | null | undefined): string {
  if (status === "pending") return "Pendiente";
  if (status === "disabled") return "Desactivada";
  return "Activa";
}

export function groupPeopleByClient<
  T extends { client_id: string; client: { id: string; name: string; kind: string } },
>(people: T[]) {
  const groups = new Map<string, { client: T["client"]; people: T[] }>();
  for (const person of people) {
    const existing = groups.get(person.client_id);
    if (existing) {
      existing.people.push(person);
    } else {
      groups.set(person.client_id, { client: person.client, people: [person] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.client.kind !== b.client.kind) return a.client.kind === "hub" ? -1 : 1;
    return a.client.name.localeCompare(b.client.name, "es");
  });
}

export function hubMemberLabel(
  member: Pick<HubMember, "full_name" | "email"> | null | undefined
): string {
  if (!member) return "Sin asignar";
  return member.full_name || member.email;
}
