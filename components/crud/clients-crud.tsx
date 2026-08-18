"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  archiveCustomerClients,
  createCustomerClient,
  deleteCustomerClient,
  deleteCustomerClients,
  unarchiveCustomerClients,
  updateCustomerClient,
} from "@/app/actions/clients";
import {
  BulkBar,
  FilterChip,
  ListToolbar,
  RecordStateBadge,
  RowCheckbox,
  SelectAllCheckbox,
  toastBulk,
} from "@/components/crud/list-view";
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
import {
  compactAge,
  confirmArchive,
  confirmPermanentDelete,
  confirmRestore,
  countFilledFilters,
  includesNormalized,
  matchesArchivedFilter,
  sortByNameOrCreated,
  toggleSelectedId,
  toggleVisibleSelection,
  type ListSort,
  type RecordStateFilter,
} from "@/lib/list-view";
import type { Client } from "@/lib/types";

export function ClientsCrud({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recordState, setRecordState] = useState<RecordStateFilter>("all");
  const [sort, setSort] = useState<ListSort>("created_desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const filtered = clients.filter(
      (client) =>
        matchesArchivedFilter(client.archived_at, recordState) &&
        (includesNormalized(client.name, query) || includesNormalized(client.slug, query))
    );
    return sortByNameOrCreated(filtered, sort, (client) => client.name, (client) => client.created_at);
  }, [clients, query, recordState, sort]);

  const visibleIds = rows.map((client) => client.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const selectedClient = clients.find((client) => client.id === selectedId) ?? null;

  function runSelected(
    confirm: (count: number) => boolean,
    action: (ids: string[]) => Promise<Parameters<typeof toastBulk>[0]>,
    done: string
  ) {
    if (selected.length === 0) return;
    if (!confirm(selected.length)) return;
    startTransition(async () => {
      const result = await action(selected);
      toastBulk(result, done);
      if (result.success) setSelected([]);
    });
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Clientes"
        onRefresh={() => router.refresh()}
        add={
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar cliente
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre"
          className="h-9 w-44"
        />
        <Select value={recordState} onValueChange={(value) => setRecordState(value as RecordStateFilter)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="archived">Archivados</SelectItem>
          </SelectContent>
        </Select>
        <FilterChip
          count={countFilledFilters([query, recordState])}
          onClear={() => {
            setQuery("");
            setRecordState("all");
          }}
        />
        <Select value={sort} onValueChange={(value) => setSort(value as ListSort)}>
          <SelectTrigger className="ml-auto h-9 w-40">
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
          runSelected((count) => confirmArchive(count, "clientes"), archiveCustomerClients, "archivados")
        }
        onRestore={() =>
          runSelected(
            (count) => confirmRestore(count, "clientes"),
            unarchiveCustomerClients,
            "restaurados"
          )
        }
        onDelete={() =>
          runSelected(
            (count) => confirmPermanentDelete(count, "clientes"),
            deleteCustomerClients,
            "eliminados"
          )
        }
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
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
              <th className="px-4 py-2.5">ID</th>
              <th className="px-4 py-2.5 text-right font-normal">
                {rows.length} de {clients.length}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No hay clientes con esos filtros.
                </td>
              </tr>
            ) : (
              rows.map((client) => (
                <tr
                  key={client.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => setSelectedId(client.id)}
                >
                  <td className="px-4 py-3">
                    <RowCheckbox
                      checked={selected.includes(client.id)}
                      onChange={() => setSelected(toggleSelectedId(selected, client.id))}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3">
                    <RecordStateBadge archived={Boolean(client.archived_at)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.slug}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {compactAge(client.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} pending={pending} startTransition={startTransition} />

      <ClientSheet
        client={selectedClient}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        pending={pending}
        startTransition={startTransition}
      />
    </div>
  );
}

function AddClientDialog({
  open,
  onOpenChange,
  pending,
  startTransition,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  const [name, setName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createCustomerClient({ name, notifyEmail });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setName("");
      setNotifyEmail("");
      onOpenChange(false);
      toast.success("Cliente creado");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar cliente</DialogTitle>
          <DialogDescription>La cuenta queda activa y aparece en el tablero y en Equipo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-client">Nombre</Label>
            <Input
              id="new-client"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-client-email">Correo de avisos</Label>
            <Input
              id="new-client-email"
              type="email"
              value={notifyEmail}
              onChange={(event) => setNotifyEmail(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientSheet({
  client,
  onOpenChange,
  pending,
  startTransition,
}: {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  return (
    <Sheet open={Boolean(client)} onOpenChange={onOpenChange}>
      <SheetContent>
        {client ? (
          <ClientForm
            key={client.id}
            client={client}
            pending={pending}
            startTransition={startTransition}
            onDeleted={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ClientForm({
  client,
  pending,
  startTransition,
  onDeleted,
}: {
  client: Client;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
  onDeleted: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [notifyEmail, setNotifyEmail] = useState(client.notify_email ?? "");

  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{client.name}</SheetTitle>
        <SheetDescription>Cliente · {client.slug}</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-6 pb-6">
        <RecordStateBadge archived={Boolean(client.archived_at)} />
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Correo de avisos</Label>
          <Input
            type="email"
            value={notifyEmail}
            onChange={(event) => setNotifyEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateCustomerClient({ id: client.id, name, notifyEmail });
                if (!result.success) toast.error(result.error);
                else toast.success("Guardado");
              })
            }
          >
            Guardar
          </Button>
          {client.archived_at ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await unarchiveCustomerClients([client.id]);
                  toastBulk(result, "restaurados");
                })
              }
            >
              Restaurar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (!confirmArchive(1, "cliente")) return;
                startTransition(async () => {
                  const result = await archiveCustomerClients([client.id]);
                  toastBulk(result, "archivados");
                });
              }}
            >
              Archivar
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirmPermanentDelete(1, "cliente")) return;
              startTransition(async () => {
                const result = await deleteCustomerClient(client.id);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("Cliente eliminado");
                  onDeleted();
                }
              });
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
