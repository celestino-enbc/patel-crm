import { InviteSignupForm } from "@/components/auth/invite-signup-form";
import { getInvitationPreview } from "@/app/actions/invitations";
import Link from "next/link";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const preview = await getInvitationPreview(token);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
      <div className="w-full rounded-3xl border bg-card p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Patel CRM</p>
        <h1 className="mt-2 text-2xl font-semibold">Invitación</h1>
        {!preview.success || !preview.data ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-destructive">{preview.error}</p>
            <Link href="/login" className="text-sm underline">
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <InviteSignupForm token={token} preview={preview.data} />
          </div>
        )}
      </div>
    </main>
  );
}
