import { createHash, randomBytes } from "node:crypto";

export {
  INVITATION_TTL_DAYS,
  buildInviteUrl,
  invitationExpiresAt,
  isInvitationActive,
} from "@/lib/invitation-status";

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
