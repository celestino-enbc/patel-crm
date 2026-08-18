"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Copy, Users } from "lucide-react";
import { createInvitation } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client, HubMember } from "@/lib/types";

interface HubTeamDialogProps {
  hub: Client | null;
  members: HubMember[];
}

export function HubTeamDialog({ hub, members }: HubTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setUrl(null);
    setCopied(false);
    setError(null);
  }

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hub) return;
    setError(null);
    startTransition(async () => {
      const result = await createInvitation({ clientId: hub.id, email });
      if (!result.success || !result.data) {
        setError(result.error ?? "No se pudo crear la invitación.");
        return;
      }
      setUrl(result.data.url);
    });
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Users className="h-4 w-4" />
          Equipo<span className="hidden sm:inline"> VisorLab</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Responsables de VisorLab</DialogTitle>
          <DialogDescription>
            Estas personas pueden atender peticiones. Invita a alguien del equipo para que aparezca
            en el selector de responsable.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 rounded-xl border bg-muted/30 p-3">
          {members.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aún no hay miembros en el hub.</li>
          ) : (
            members.map((member) => (
              <li key={member.id} className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{member.full_name}</span>
                <span className="truncate text-xs text-muted-foreground">{member.email}</span>
              </li>
            ))
          )}
        </ul>
        {url ? (
          <div className="space-y-3">
            <Label>Enlace de invitación a VisorLab</Label>
            <div className="flex gap-2">
              <Input readOnly value={url} className="min-w-0" />
              <Button type="button" variant="secondary" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button type="button" className="w-full" onClick={() => reset()}>
              Invitar a otra persona
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hub-invite-email">Correo (opcional)</Label>
              <Input
                id="hub-invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ana@visorlab.study"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending || !hub}>
              {pending ? "Generando…" : "Invitar a VisorLab"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
