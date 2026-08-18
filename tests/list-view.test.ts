import { describe, expect, it } from "vitest";
import { bulkPayload, normalizeIds } from "@/lib/bulk";
import {
  compactAge,
  countFilledFilters,
  includesNormalized,
  matchesArchivedFilter,
  sortByNameOrCreated,
  toggleSelectedId,
  toggleVisibleSelection,
} from "@/lib/list-view";

describe("list view helpers", () => {
  it("normaliza ids únicos y limita a 100", () => {
    expect(normalizeIds(["a", "a", "", "b"])).toEqual(["a", "b"]);
    expect(normalizeIds(Array.from({ length: 120 }, (_, index) => String(index)))).toHaveLength(100);
  });

  it("filtra archivados y cuenta filtros activos", () => {
    expect(matchesArchivedFilter(null, "all")).toBe(true);
    expect(matchesArchivedFilter(null, "active")).toBe(true);
    expect(matchesArchivedFilter("2026-08-18", "archived")).toBe(true);
    expect(matchesArchivedFilter(null, "archived")).toBe(false);
    expect(countFilledFilters(["", "all", "activo"])).toBe(1);
  });

  it("alterna selección de filas y de la vista actual", () => {
    expect(toggleSelectedId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleSelectedId(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleVisibleSelection(["a"], ["b", "c"])).toEqual(["a", "b", "c"]);
    expect(toggleVisibleSelection(["a", "b", "c"], ["b", "c"])).toEqual(["a"]);
  });

  it("ordena por fecha y edad compacta", () => {
    const sorted = sortByNameOrCreated(
      [
        { name: "B", created_at: "2026-08-18T10:00:00.000Z" },
        { name: "A", created_at: "2026-08-18T12:00:00.000Z" },
      ],
      "created_desc",
      (row) => row.name,
      (row) => row.created_at
    );
    expect(sorted.map((row) => row.name)).toEqual(["A", "B"]);
    expect(compactAge("2026-08-18T11:54:00.000Z", Date.parse("2026-08-18T12:00:00.000Z"))).toBe("6 m");
    expect(includesNormalized("Two Sides", "sides")).toBe(true);
  });

  it("arma el resultado de una acción masiva", () => {
    expect(bulkPayload(0, 0).success).toBe(false);
    expect(bulkPayload(2, 3).data).toEqual({ ok: 2, failed: 1 });
    expect(bulkPayload(0, 2).success).toBe(false);
  });
});
