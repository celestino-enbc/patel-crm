"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  archiveCustomerClient,
  createCustomerClient,
  unarchiveCustomerClient,
  updateCustomerClient,
} from "@/app/actions/clients";
import { ModuleHeader } from "@/components/crud/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/lib/types";

export function ClientsCrud({ clients }: { clients: Client[] }) {
  const [name, setName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [edits, setEdits] = useState<Record<string, { name: string; notifyEmail: string }>>({});
  const [pending, startTransition] = useTransition();

  function edit(client: Client) {
    return (
      edits[client.id] ?? {
        name: client.name,
        notifyEmail: client.notify_email ?? "",
      }
    );
  }

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
      toast.success("Cliente creado");
    });
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        kicker="Módulo"
        title="Clientes"
        description="Crea, edita o archiva cuentas. Un cliente archivado deja de aparecer en el tablero y en las altas."
      />
      <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="new-client">Nuevo cliente</Label>
          <Input
            id="new-client"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la empresa"
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
            placeholder="ops@cliente.com"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            Crear
          </Button>
        </div>
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Nombre</th>
              <th className="px-3 py-3 font-medium">Avisos</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const values = edit(client);
              return (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <Input
                      value={values.name}
                      onChange={(event) =>
                        setEdits((current) => ({
                          ...current,
                          [client.id]: { ...values, name: event.target.value },
                        }))
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{client.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="email"
                      value={values.notifyEmail}
                      onChange={(event) =>
                        setEdits((current) => ({
                          ...current,
                          [client.id]: { ...values, notifyEmail: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={client.archived_at ? "outline" : "secondary"}>
                      {client.archived_at ? "Archivado" : "Activo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await updateCustomerClient({
                              id: client.id,
                              name: values.name,
                              notifyEmail: values.notifyEmail,
                            });
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
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await unarchiveCustomerClient(client.id);
                              if (!result.success) toast.error(result.error);
                            })
                          }
                        >
                          Restaurar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              if (!window.confirm(`¿Archivar ${client.name}?`)) return;
                              const result = await archiveCustomerClient(client.id);
                              if (!result.success) toast.error(result.error);
                            })
                          }
                        >
                          Archivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
