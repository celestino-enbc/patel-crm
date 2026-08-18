export const INVITATION_TTL_DAYS = 7;

export function invitationExpiresAt(from: Date = new Date(), days = INVITATION_TTL_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isInvitationActive(
  invitation: { expires_at: string; used_at: string | null },
  now: Date = new Date()
): boolean {
  if (invitation.used_at) return false;
  return new Date(invitation.expires_at).getTime() > now.getTime();
}

export function buildInviteUrl(token: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/invite/${encodeURIComponent(token)}`;
}
