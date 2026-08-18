export type RecordStateFilter = "all" | "active" | "archived";
export type ListSort = "created_desc" | "created_asc" | "name_asc";

export function includesNormalized(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export function matchesArchivedFilter(
  archivedAt: string | null | undefined,
  filter: RecordStateFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "archived") return Boolean(archivedAt);
  return !archivedAt;
}

export function countFilledFilters(values: Array<string | undefined>, empty = "all"): number {
  return values.filter((value) => Boolean(value?.trim()) && value !== empty).length;
}

export function sortByNameOrCreated<T>(
  rows: T[],
  sort: ListSort,
  name: (row: T) => string,
  created: (row: T) => string
): T[] {
  return [...rows].sort((a, b) => {
    if (sort === "name_asc") return name(a).localeCompare(name(b), "es");
    const delta = new Date(created(a)).getTime() - new Date(created(b)).getTime();
    return sort === "created_asc" ? delta : -delta;
  });
}

export function toggleSelectedId(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

export function toggleVisibleSelection(selected: string[], visibleIds: string[]): string[] {
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  if (allSelected) return selected.filter((id) => !visibleIds.includes(id));
  return Array.from(new Set(selected.concat(visibleIds)));
}

export function confirmArchive(count: number, noun: string): boolean {
  return window.confirm(`¿Archivar ${count} ${noun}?`);
}

export function confirmRestore(count: number, noun: string): boolean {
  return window.confirm(`¿Restaurar ${count} ${noun}?`);
}

export function confirmPermanentDelete(count: number, noun: string): boolean {
  return window.confirm(
    `Esto elimina de forma definitiva ${count} ${noun}. No se puede deshacer. ¿Continuar?`
  );
}

export function compactAge(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return `${Math.floor(days / 30)} mes`;
}
