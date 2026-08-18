import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SIGNED_URL_TTL_SECONDS, isOverdue } from "@/lib/tasks";

describe("evidencias privadas y vencidas", () => {
  it("usa signed URLs de corta duración", () => {
    expect(SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(300);
    const source = readFileSync("app/actions/attachments.ts", "utf8");
    expect(source).not.toMatch(/getPublicUrl/);
    expect(source).toMatch(/createSignedUrl/);
  });

  it("marca vencidas solo si siguen abiertas", () => {
    expect(
      isOverdue({
        due_date: "2000-01-01T00:00:00.000Z",
        status: "solicitado",
        archived_at: null,
      })
    ).toBe(true);
    expect(
      isOverdue({
        due_date: "2000-01-01T00:00:00.000Z",
        status: "hecho",
        archived_at: null,
      })
    ).toBe(false);
    expect(
      isOverdue({
        due_date: "2000-01-01T00:00:00.000Z",
        status: "solicitado",
        archived_at: "2026-01-01T00:00:00.000Z",
      })
    ).toBe(false);
  });
});
