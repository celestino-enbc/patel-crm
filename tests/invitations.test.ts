import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { signUp } from "@/app/actions/auth";
import {
  buildInviteUrl,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isInvitationActive,
} from "@/lib/invitations";

describe("invitaciones", () => {
  it("hashea el token de forma determinista y no reversible", () => {
    const token = "token-de-prueba";
    const hash = hashInvitationToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashInvitationToken(token));
    expect(hash).not.toBe(token);
  });

  it("genera tokens distintos", () => {
    expect(generateInvitationToken()).not.toBe(generateInvitationToken());
  });

  it("caduca a los 7 días y detecta usadas o vencidas", () => {
    const from = new Date("2026-08-18T12:00:00.000Z");
    const expires = invitationExpiresAt(from, 7);
    expect(expires.toISOString()).toBe("2026-08-25T12:00:00.000Z");

    expect(
      isInvitationActive(
        { expires_at: expires.toISOString(), used_at: null },
        new Date("2026-08-20T12:00:00.000Z")
      )
    ).toBe(true);

    expect(
      isInvitationActive(
        { expires_at: expires.toISOString(), used_at: null },
        new Date("2026-08-26T12:00:00.000Z")
      )
    ).toBe(false);

    expect(
      isInvitationActive(
        { expires_at: expires.toISOString(), used_at: "2026-08-19T12:00:00.000Z" },
        new Date("2026-08-20T12:00:00.000Z")
      )
    ).toBe(false);
  });

  it("arma la URL de invitación", () => {
    expect(buildInviteUrl("abc.123", "http://localhost:3000/")).toBe(
      "http://localhost:3000/invite/abc.123"
    );
  });

  it("rechaza el registro abierto sin invitación", async () => {
    const result = await signUp();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invitación/i);
  });

  it("el login ya no expone selector de client_id", () => {
    const source = readFileSync("components/auth/login-form.tsx", "utf8");
    expect(source).not.toMatch(/clientId/);
    expect(source).not.toMatch(/Crear cuenta/);
  });
});
