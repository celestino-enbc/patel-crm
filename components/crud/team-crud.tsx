"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { createInvitation, revokeInvitation, type InvitationRow } from "@/app/actions/invitations";
import { createManualPerson, setPersonStatus, updatePersonContact } from "@/app/actions/team";
import { ModuleHeader } from "@/components/crud/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isInvitationActive } from "@/lib/invitation-status";
import { groupPeopleByClient, personStatusLabel } from "@/lib/team";
import type { Client, DirectoryPerson } from "@/lib/types";

export function TeamCrud({
  people,
  clients,
  invitations,
}: {
  people: DirectoryPerson[];
  clients: Client[];
  invitations: InvitationRow[];
}) {
  const hub = clients.find((client) => client.kind === "hub");
  const [companyId, setCompanyId] = useState("all");
  const [inviteClientId, setInviteClientId] = useState(hub?.id ?? clients[0]?.id ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [manual, setManual] = useState({
    clientId: hub?.id ?? clients[0]?.id ?? "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    jobTitle: "",
    notes: "",
    activateNow: false,
  });
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const filtered =
      companyId === "all" ? people : people.filter((person) => person.client_id === companyId);
    return groupPeopleByClient(filtered);
  }, [people, companyId]);

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    setInviteUrl(null);
    startTransition(async () => {
      const result = await createInvitation({ clientId: inviteClientId, email: inviteEmail });
      if (!result.success || !result.data) {
        toast.error(result.error);
        return;
      }
      setInviteUrl(result.data.url);
      setInviteEmail("");
      toast.success("Invitación generada");
    });
  }

  function handleManual(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createManualPerson(manual);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setManual((current) => ({
        ...current,
        fullName: "",
        email: "",
        password: "",
        phone: "",
        jobTitle: "",
        notes: "",
        activateNow: false,
      }));
      toast.success(
        manual.activateNow
          ? "Persona registrada y activa"
          : "Persona registrada. Actívala cuando deba entrar."
      );
    });
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        kicker="Módulo"
        title="Equipo"
        description="Primero el equipo o empresa, luego cada persona con sus datos de contacto. El alta puede ser por invitación o registro manual con activación."
      />

      <div className="max-w-sm space-y-2">
        <Label>Ver equipo / empresa</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.kind === "hub" ? `${client.name} (VisorLab)` : client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Aún no hay personas en este equipo. Invita o registra a alguien abajo.
        </p>
      ) : (
        grouped.map((group) => (
          <section key={group.client.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{group.client.name}</h3>
              <Badge variant={group.client.kind === "hub" ? "secondary" : "outline"}>
                {group.client.kind === "hub" ? "VisorLab" : "Cliente"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {group.people.length} {group.people.length === 1 ? "persona" : "personas"}
              </span>
            </div>
            <div className="space-y-3">
              {group.people.map((person) => (
                <PersonCard key={person.id} person={person} pending={pending} startTransition={startTransition} />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleInvite} className="space-y-3 rounded-2xl border bg-card p-4">
          <h3 className="text-sm font-semibold">Alta por invitación</h3>
          <p className="text-xs text-muted-foreground">
            Genera un enlace de 7 días. Al aceptar, la cuenta queda activa.
          </p>
          <div className="space-y-2">
            <Label>Equipo / empresa</Label>
            <Select value={inviteClientId} onValueChange={setInviteClientId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                    {client.kind === "hub" ? " (VisorLab)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Correo (opcional)</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="ana@empresa.com"
            />
          </div>
          <Button type="submit" disabled={pending || !inviteClientId}>
            Generar enlace
          </Button>
          {inviteUrl && (
            <div className="space-y-2">
              <Label>Copia este enlace ahora; no se vuelve a mostrar</Label>
              <Input readOnly value={inviteUrl} />
            </div>
          )}
        </form>

        <form onSubmit={handleManual} className="space-y-3 rounded-2xl border bg-card p-4">
          <h3 className="text-sm font-semibold">Registro y activación manual</h3>
          <p className="text-xs text-muted-foreground">
            Das de alta el contacto. Queda pendiente hasta que lo actives, salvo que marques activar ahora.
          </p>
          <div className="space-y-2">
            <Label>Equipo / empresa</Label>
            <Select
              value={manual.clientId}
              onValueChange={(clientId) => setManual((current) => ({ ...current, clientId }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                    {client.kind === "hub" ? " (VisorLab)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Nombre</Label>
              <Input
                id="manual-name"
                value={manual.fullName}
                onChange={(event) => setManual((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-title">Puesto</Label>
              <Input
                id="manual-title"
                value={manual.jobTitle}
                onChange={(event) => setManual((current) => ({ ...current, jobTitle: event.target.value }))}
                placeholder="Diseño, Ops, Dirección…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-email">Correo</Label>
              <Input
                id="manual-email"
                type="email"
                value={manual.email}
                onChange={(event) => setManual((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-phone">Teléfono</Label>
              <Input
                id="manual-phone"
                value={manual.phone}
                onChange={(event) => setManual((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-password">Contraseña inicial</Label>
            <Input
              id="manual-password"
              type="password"
              value={manual.password}
              onChange={(event) => setManual((current) => ({ ...current, password: event.target.value }))}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-notes">Notas de contacto</Label>
            <Textarea
              id="manual-notes"
              value={manual.notes}
              onChange={(event) => setManual((current) => ({ ...current, notes: event.target.value }))}
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={manual.activateNow}
              onChange={(event) =>
                setManual((current) => ({ ...current, activateNow: event.target.checked }))
              }
            />
            Activar ahora (puede entrar de inmediato)
          </label>
          <Button type="submit" disabled={pending || !manual.clientId}>
            Registrar persona
          </Button>
        </form>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Invitaciones</h3>
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">Equipo</th>
                <th className="px-3 py-3 font-medium">Correo</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Caduca</th>
                <th className="px-3 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No hay invitaciones.
                  </td>
                </tr>
              ) : (
                invitations.map((invite) => {
                  const active = isInvitationActive(invite);
                  return (
                    <tr key={invite.id} className="border-b last:border-0">
                      <td className="px-3 py-3">{invite.client.name}</td>
                      <td className="px-3 py-3">{invite.email || "Cualquier correo"}</td>
                      <td className="px-3 py-3">
                        <Badge variant={invite.used_at ? "secondary" : active ? "outline" : "destructive"}>
                          {invite.used_at ? "Usada" : active ? "Activa" : "Caducada"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {new Date(invite.expires_at).toLocaleString("es")}
                      </td>
                      <td className="px-3 py-3">
                        {active && !invite.used_at ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const result = await revokeInvitation(invite.id);
                                if (!result.success) toast.error(result.error);
                                else toast.success("Invitación anulada");
                              })
                            }
                          >
                            Anular
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PersonCard({
  person,
  pending,
  startTransition,
}: {
  person: DirectoryPerson;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  const [fullName, setFullName] = useState(person.full_name);
  const [jobTitle, setJobTitle] = useState(person.job_title ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");

  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{person.full_name}</p>
          <p className="text-xs text-muted-foreground">{person.email}</p>
        </div>
        <Badge
          variant={
            person.status === "active" ? "secondary" : person.status === "pending" ? "outline" : "destructive"
          }
        >
          {personStatusLabel(person.status)}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Puesto</Label>
          <Input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notas de contacto</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updatePersonContact({
                id: person.id,
                fullName,
                jobTitle,
                phone,
                notes,
              });
              if (!result.success) toast.error(result.error);
              else toast.success("Contacto guardado");
            })
          }
        >
          Guardar contacto
        </Button>
        {person.status !== "active" && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setPersonStatus(person.id, "active");
                if (!result.success) toast.error(result.error);
                else toast.success("Cuenta activada");
              })
            }
          >
            Activar
          </Button>
        )}
        {person.status === "active" && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setPersonStatus(person.id, "disabled");
                if (!result.success) toast.error(result.error);
                else toast.success("Cuenta desactivada");
              })
            }
          >
            Desactivar
          </Button>
        )}
      </div>
    </article>
  );
}
