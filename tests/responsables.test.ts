import { describe, expect, it } from "vitest";
import { matchesBoardFilters, type BoardFiltersState } from "@/lib/board-filters";
import {
  groupPeopleByClient,
  hubMemberLabel,
  matchesResponsableFilter,
  normalizeAssigneeUserId,
} from "@/lib/team";

const baseFilters: BoardFiltersState = {
  query: "",
  categoryId: "all",
  clientId: "all",
  assignee: "all",
  responsableId: "all",
};

const task = {
  title: "Imagen de producto",
  description: "Falta recorte",
  category_id: "cat-1",
  client_id: "cli-1",
  assignee_kind: "hub" as const,
  assignee_user_id: "user-ana",
};

describe("responsables VisorLab", () => {
  it("normaliza vacío y sin asignar a null", () => {
    expect(normalizeAssigneeUserId("")).toBeNull();
    expect(normalizeAssigneeUserId("unassigned")).toBeNull();
    expect(normalizeAssigneeUserId("none")).toBeNull();
    expect(normalizeAssigneeUserId("user-ana")).toBe("user-ana");
  });

  it("filtra por persona, sin asignar o todos", () => {
    expect(matchesResponsableFilter("user-ana", "all")).toBe(true);
    expect(matchesResponsableFilter(null, "unassigned")).toBe(true);
    expect(matchesResponsableFilter("user-ana", "unassigned")).toBe(false);
    expect(matchesResponsableFilter("user-ana", "user-ana")).toBe(true);
    expect(matchesResponsableFilter("user-ana", "user-luis")).toBe(false);
  });

  it("combina turno y persona en el tablero", () => {
    expect(matchesBoardFilters(task, baseFilters)).toBe(true);
    expect(matchesBoardFilters(task, { ...baseFilters, responsableId: "user-ana" })).toBe(true);
    expect(matchesBoardFilters(task, { ...baseFilters, responsableId: "unassigned" })).toBe(false);
    expect(matchesBoardFilters(task, { ...baseFilters, assignee: "client" })).toBe(false);
  });

  it("agrupa personas por empresa, hub primero", () => {
    const groups = groupPeopleByClient([
      {
        client_id: "c1",
        client: { id: "c1", name: "Two Sides", kind: "client" },
      },
      {
        client_id: "h1",
        client: { id: "h1", name: "Visor", kind: "hub" },
      },
      {
        client_id: "c1",
        client: { id: "c1", name: "Two Sides", kind: "client" },
      },
    ]);
    expect(groups.map((group) => group.client.kind)).toEqual(["hub", "client"]);
    expect(groups[1]?.people).toHaveLength(2);
  });
});
