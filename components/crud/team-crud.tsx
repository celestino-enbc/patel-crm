"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createInvitation, revokeInvitation, type InvitationRow } from "@/app/actions/invitations";
import {
  createManualPerson,
  deletePeople,
  deletePerson,
  setPeopleStatus,
  setPersonStatus,
  updatePersonContact,
} from "@/app/actions/team";
import {
  BulkBar,
  FilterChip,
  ListToolbar,
  RowCheckbox,
  SelectAllCheckbox,
  toastBulk,
} from "@/components/crud/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { isInvitationActive } from "@/lib/invitation-status";
import {
  confirmArchive,
  confirmPermanentDelete,
  confirmRestore,
  toggleSelectedId,
  toggleVisibleSelection,
} from "@/lib/list-view";
import {
  compactAge,
  countActiveDirectoryFilters,
  matchesDirectoryFilters,
  personStatusLabel,
  sortDirectoryPeople,
  userTypeLabel,
  type DirectoryListFilters,
  type DirectorySort,
} from "@/lib/team";
import type { Client, DirectoryPerson } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_FILTERS: DirectoryListFilters = {
  idQuery: "",
  nameQuery: "",
  companyId: "all",
  userType: "all",
  status: "all",
};

export function TeamCrud({
  people,
  clients,
  invitations,
  currentUserId,
}: {
  people: DirectoryPerson[];
  clients: Client[];
  invitations: InvitationRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const hub = clients.find((client) => client.kind === "hub");
  const [filters, setFilters] = useState<DirectoryListFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<DirectorySort>("created_desc");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const filtered = people.filter((person) => matchesDirectoryFilters(person, filters));
    return sortDirectoryPeople(filtered, sort);
  }, [people, filters, sort]);

  const activeFilterCount = countActiveDirectoryFilters(filters);
  const selectedPerson = people.find((person) => person.id === selectedId) ?? null;
  const visibleIds = rows.map((person) => person.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function runSelected(
    confirm: (count: number) => boolean,
    action: () => Promise<Parameters<typeof toastBulk>[0]>,
    done: string
  ) {
    if (selected.length === 0) return;
    if (!confirm(selected.length)) return;
    startTransition(async () => {
      const result = await action();
      toastBulk(result, done);
      if (result.success) setSelected([]);
    });
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Usuarios"
        onRefresh={() => router.refresh()}
        add={
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar usuario
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filters.idQuery}
          onChange={(event) => setFilters((current) => ({ ...current, idQuery: event.target.value }))}
          placeholder="ID"
          className="h-9 w-36"
        />
        <Input
          value={filters.nameQuery}
          onChange={(event) =>
            setFilters((current) => ({ ...current, nameQuery: event.target.value }))
          }
          placeholder="Nombre"
          className="h-9 w-40"
        />
        <Select
          value={filters.companyId}
          onValueChange={(companyId) => setFilters((current) => ({ ...current, companyId }))}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Empresa</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.userType}
          onValueChange={(userType) => setFilters((current) => ({ ...current, userType }))}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tipo</SelectItem>
            <SelectItem value="hub">VisorLab</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(status) => setFilters((current) => ({ ...current, status }))}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="disabled">Desactivada</SelectItem>
          </SelectContent>
        </Select>
        {activeFilterCount > 0 ? (
          <FilterChip count={activeFilterCount} onClear={() => setFilters(EMPTY_FILTERS)} />
        ) : null}
        <Select value={sort} onValueChange={(value) => setSort(value as DirectorySort)}>
          <SelectTrigger className="ml-auto h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Creado ↓</SelectItem>
            <SelectItem value="created_asc">Creado ↑</SelectItem>
            <SelectItem value="name_asc">Nombre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkBar
        count={selected.length}
        pending={pending}
        onClear={() => setSelected([])}
        onArchive={() =>
          runSelected(
            (count) => confirmArchive(count, "usuarios"),
            () => setPeopleStatus(selected, "disabled"),
            "archivados"
          )
        }
        onRestore={() =>
          runSelected(
            (count) => confirmRestore(count, "usuarios"),
            () => setPeopleStatus(selected, "active"),
            "restaurados"
          )
        }
        onDelete={() =>
          runSelected(
            (count) => confirmPermanentDelete(count, "usuarios"),
            () => deletePeople(selected),
            "eliminados"
          )
        }
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-xs font-medium text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <SelectAllCheckbox
                  checked={allVisibleSelected}
                  onChange={() => setSelected(toggleVisibleSelection(selected, visibleIds))}
                />
              </th>
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">ID</th>
              <th className="px-4 py-2.5 text-right font-normal">
                {rows.length} de {people.length}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No hay usuarios con esos filtros. Agrega uno o limpia la búsqueda.
                </td>
              </tr>
            ) : (
              rows.map((person) => (
                <tr
                  key={person.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => setSelectedId(person.id)}
                >
                  <td className="px-4 py-3">
                    <RowCheckbox
                      checked={selected.includes(person.id)}
                      onChange={() => setSelected(toggleSelectedId(selected, person.id))}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{person.full_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={person.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span>{userTypeLabel(person.client.kind)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{person.client.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{person.email}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {compactAge(person.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InvitationsTable invitations={invitations} pending={pending} startTransition={startTransition} />

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        clients={clients}
        defaultClientId={hub?.id ?? clients[0]?.id ?? ""}
        pending={pending}
        startTransition={startTransition}
      />

      <PersonSheet
        person={selectedPerson}
        currentUserId={currentUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        pending={pending}
        startTransition={startTransition}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: DirectoryPerson["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        status === "active" && "bg-emerald-50 text-emerald-700",
        status === "pending" && "bg-amber-50 text-amber-800",
        status === "disabled" && "bg-rose-50 text-rose-700"
      )}
    >
      {personStatusLabel(status)}
    </Badge>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  clients,
  defaultClientId,
  pending,
  startTransition,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  defaultClientId: string;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  const [mode, setMode] = useState<"invite" | "manual">("invite");
  const [inviteClientId, setInviteClientId] = useState(defaultClientId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [manual, setManual] = useState({
    clientId: defaultClientId,
    fullName: "",
    email: "",
    password: "",
    phone: "",
    jobTitle: "",
    notes: "",
    activateNow: false,
  });

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
          ? "Usuario registrado y activo"
          : "Usuario registrado. Actívalo cuando deba entrar."
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar usuario</DialogTitle>
          <DialogDescription>
            Invitación de 7 días (queda activo al aceptar) o alta manual con activación.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              mode === "invite" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => setMode("invite")}
          >
            Invitación
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              mode === "manual" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => setMode("manual")}
          >
            Alta manual
          </button>
        </div>
        {mode === "invite" ? (
          <form onSubmit={handleInvite} className="space-y-3">
            <CompanyField
              value={inviteClientId}
              clients={clients}
              onChange={setInviteClientId}
            />
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
            {inviteUrl ? (
              <div className="space-y-2">
                <Label>Copia este enlace ahora; no se vuelve a mostrar</Label>
                <Input readOnly value={inviteUrl} />
              </div>
            ) : null}
          </form>
        ) : (
          <form onSubmit={handleManual} className="space-y-3">
            <CompanyField
              value={manual.clientId}
              clients={clients}
              onChange={(clientId) => setManual((current) => ({ ...current, clientId }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-name">Nombre</Label>
                <Input
                  id="manual-name"
                  value={manual.fullName}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-title">Puesto</Label>
                <Input
                  id="manual-title"
                  value={manual.jobTitle}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, jobTitle: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-email">ID / correo</Label>
                <Input
                  id="manual-email"
                  type="email"
                  value={manual.email}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-phone">Teléfono</Label>
                <Input
                  id="manual-phone"
                  value={manual.phone}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-password">Contraseña inicial</Label>
              <Input
                id="manual-password"
                type="password"
                value={manual.password}
                onChange={(event) =>
                  setManual((current) => ({ ...current, password: event.target.value }))
                }
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-notes">Notas</Label>
              <Textarea
                id="manual-notes"
                value={manual.notes}
                onChange={(event) =>
                  setManual((current) => ({ ...current, notes: event.target.value }))
                }
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
              Activar ahora
            </label>
            <Button type="submit" disabled={pending || !manual.clientId}>
              Guardar usuario
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompanyField({
  value,
  clients,
  onChange,
}: {
  value: string;
  clients: Client[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Tipo / empresa</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {userTypeLabel(client.kind)} · {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PersonSheet({
  person,
  currentUserId,
  onOpenChange,
  pending,
  startTransition,
}: {
  person: DirectoryPerson | null;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  return (
    <Sheet open={Boolean(person)} onOpenChange={onOpenChange}>
      <SheetContent>
        {person ? (
          <PersonForm
            key={person.id}
            person={person}
            currentUserId={currentUserId}
            pending={pending}
            startTransition={startTransition}
            onDeleted={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PersonForm({
  person,
  currentUserId,
  pending,
  startTransition,
  onDeleted,
}: {
  person: DirectoryPerson;
  currentUserId: string;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
  onDeleted: () => void;
}) {
  const [fullName, setFullName] = useState(person.full_name);
  const [jobTitle, setJobTitle] = useState(person.job_title ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");

  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{person.full_name}</SheetTitle>
        <SheetDescription>
          {userTypeLabel(person.client.kind)} · {person.client.name}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={person.status} />
          <span className="font-mono text-xs text-muted-foreground">{person.email}</span>
        </div>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Puesto</Label>
          <Input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
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
            Guardar
          </Button>
          {person.status === "active" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (!confirmArchive(1, "usuario")) return;
                startTransition(async () => {
                  const result = await setPersonStatus(person.id, "disabled");
                  if (!result.success) toast.error(result.error);
                  else toast.success("Cuenta archivada");
                });
              }}
            >
              Archivar
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setPersonStatus(person.id, "active");
                  if (!result.success) toast.error(result.error);
                  else toast.success(person.status === "pending" ? "Cuenta activada" : "Cuenta restaurada");
                })
              }
            >
              {person.status === "pending" ? "Activar" : "Restaurar"}
            </Button>
          )}
          {person.id !== currentUserId ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (!confirmPermanentDelete(1, "usuario")) return;
                startTransition(async () => {
                  const result = await deletePerson(person.id);
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("Usuario eliminado");
                    onDeleted();
                  }
                });
              }}
            >
              Eliminar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InvitationsTable({
  invitations,
  pending,
  startTransition,
}: {
  invitations: InvitationRow[];
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  if (invitations.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Invitaciones</h3>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Empresa</th>
              <th className="px-4 py-2.5 font-medium">Correo</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invite) => {
              const active = isInvitationActive(invite);
              return (
                <tr key={invite.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{invite.client.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{invite.email || "Cualquier correo"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={invite.used_at ? "secondary" : active ? "outline" : "destructive"}>
                      {invite.used_at ? "Usada" : active ? "Activa" : "Caducada"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {active && !invite.used_at ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
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
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
