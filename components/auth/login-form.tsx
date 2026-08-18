"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types";

const initialState: ActionResult = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Procesando…" : "Iniciar sesión"}
    </Button>
  );
}

export function LoginForm() {
  const [state, loginAction] = useFormState(signIn, initialState);

  return (
    <form action={loginAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" required placeholder="nina.v@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground">
        El alta de cuentas es solo por invitación de Visor. Si te enviaron un enlace, ábrelo
        directamente.
      </p>
    </form>
  );
}
