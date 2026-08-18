"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signUpWithInvitation, type InvitationPreview } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types";

const initialState: ActionResult = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creando cuenta…" : "Crear cuenta"}
    </Button>
  );
}

export function InviteSignupForm({
  token,
  preview,
}: {
  token: string;
  preview: InvitationPreview;
}) {
  const [state, action] = useFormState(signUpWithInvitation, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm">
        Vas a unirte a <strong>{preview.clientName}</strong>
        {preview.clientKind === "hub" ? " (hub Visor)" : ""}. El enlace caduca el{" "}
        {new Date(preview.expiresAt).toLocaleString("es")}.
      </p>
      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre</Label>
        <Input id="fullName" name="fullName" required placeholder="Ana Pérez" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={preview.email ?? ""}
          readOnly={Boolean(preview.email)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
