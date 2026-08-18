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

export type DirectorySort = "created_desc" | "created_asc" | "name_asc";

export type DirectoryListFilters = {
  idQuery: string;
  nameQuery: string;
  companyId: string;
  userType: string;
  status: string;
};

export function userTypeLabel(kind: string | null | undefined): string {
  return kind === "hub" ? "VisorLab" : "Cliente";
}

function includesNormalized(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export function matchesDirectoryFilters(
  person: {
    email: string;
    full_name: string;
    client_id: string;
    status: string;
    client: { kind: string };
  },
  filters: DirectoryListFilters
): boolean {
  if (!includesNormalized(person.email, filters.idQuery)) return false;
  if (!includesNormalized(person.full_name, filters.nameQuery)) return false;
  if (filters.companyId !== "all" && person.client_id !== filters.companyId) return false;
  if (filters.userType !== "all" && person.client.kind !== filters.userType) return false;
  if (filters.status !== "all" && person.status !== filters.status) return false;
  return true;
}

export function countActiveDirectoryFilters(filters: DirectoryListFilters): number {
  let count = 0;
  if (filters.idQuery.trim()) count += 1;
  if (filters.nameQuery.trim()) count += 1;
  if (filters.companyId !== "all") count += 1;
  if (filters.userType !== "all") count += 1;
  if (filters.status !== "all") count += 1;
  return count;
}

export function sortDirectoryPeople<T extends { full_name: string; created_at: string }>(
  people: T[],
  sort: DirectorySort
): T[] {
  return [...people].sort((a, b) => {
    if (sort === "name_asc") return a.full_name.localeCompare(b.full_name, "es");
    const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sort === "created_asc" ? delta : -delta;
  });
}

export { compactAge } from "@/lib/list-view";

export function hubMemberLabel(
  member: Pick<HubMember, "full_name" | "email"> | null | undefined
): string {
  if (!member) return "Sin asignar";
  return member.full_name || member.email;
}
