import { matchesResponsableFilter } from "@/lib/team";
import type { AssigneeKind } from "@/lib/types";

export interface BoardFiltersState {
  query: string;
  categoryId: string;
  clientId: string;
  assignee: string;
  responsableId: string;
}

export function matchesBoardFilters(
  task: {
    title: string;
    description: string;
    category_id: string;
    client_id: string;
    assignee_kind: AssigneeKind;
    assignee_user_id: string | null;
  },
  filters: BoardFiltersState
) {
  const query = filters.query.trim().toLowerCase();
  const matchesQuery =
    query.length === 0 ||
    task.title.toLowerCase().includes(query) ||
    task.description.toLowerCase().includes(query);
  const matchesCategory = filters.categoryId === "all" || filters.categoryId === task.category_id;
  const matchesClient = filters.clientId === "all" || filters.clientId === task.client_id;
  const matchesAssignee = filters.assignee === "all" || filters.assignee === task.assignee_kind;
  const matchesPerson = matchesResponsableFilter(task.assignee_user_id, filters.responsableId);
  return matchesQuery && matchesCategory && matchesClient && matchesAssignee && matchesPerson;
}
