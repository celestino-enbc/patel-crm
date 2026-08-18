import { describe, expect, it } from "vitest";
import { matchesBoardFilters, type BoardFiltersState } from "@/lib/board-filters";
import {
  compactAge,
  countActiveDirectoryFilters,
  groupPeopleByClient,
  matchesDirectoryFilters,
  matchesResponsableFilter,
  normalizeAssigneeUserId,
  sortDirectoryPeople,
  userTypeLabel,
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

  it("filtra el listado de usuarios por id, tipo y estado", () => {
    const person = {
      email: "celestino.estrada@enbc.edu.mx",
      full_name: "Celestino Estrada",
      client_id: "h1",
      status: "active",
      client: { kind: "hub" },
    };
    const filters = {
      idQuery: "celestino",
      nameQuery: "estrada",
      companyId: "all",
      userType: "hub",
      status: "active",
    };
    expect(matchesDirectoryFilters(person, filters)).toBe(true);
    expect(matchesDirectoryFilters(person, { ...filters, userType: "client" })).toBe(false);
    expect(matchesDirectoryFilters(person, { ...filters, status: "pending" })).toBe(false);
    expect(countActiveDirectoryFilters(filters)).toBe(4);
    expect(userTypeLabel("hub")).toBe("VisorLab");
    expect(userTypeLabel("client")).toBe("Cliente");
  });

  it("ordena usuarios por fecha de alta y muestra edad compacta", () => {
    const sorted = sortDirectoryPeople(
      [
        { full_name: "B", created_at: "2026-08-18T10:00:00.000Z" },
        { full_name: "A", created_at: "2026-08-18T12:00:00.000Z" },
      ],
      "created_desc"
    );
    expect(sorted.map((row) => row.full_name)).toEqual(["A", "B"]);
    expect(compactAge("2026-08-18T11:54:00.000Z", Date.parse("2026-08-18T12:00:00.000Z"))).toBe(
      "6 m"
    );
  });
});
