"use client";

import { useState, useTransition } from "react";
import { archiveCategory, createCategory, updateCategory } from "@/app/actions/categories";
import { archiveCustomerClient, updateCustomerClient } from "@/app/actions/clients";
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
import type { Category, Client } from "@/lib/types";
import { Settings2 } from "lucide-react";

export function ManageCatalogDialog({
  customers,
  categories,
}: {
  customers: Client[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clientName(client: Client) {
    return clientNames[client.id] ?? client.name;
  }

  function categoryName(category: Category) {
    return categoryNames[category.id] ?? category.name;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="h-4 w-4" />
          Catálogo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Clientes y categorías</DialogTitle>
          <DialogDescription>
            Edita nombres o archiva. Lo archivado deja de aparecer en filtros y altas nuevas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Clientes</h3>
            {customers.map((client) => (
              <div key={client.id} className="flex gap-2">
                <Input
                  value={clientName(client)}
                  onChange={(event) =>
                    setClientNames((current) => ({ ...current, [client.id]: event.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await updateCustomerClient({
                        id: client.id,
                        name: clientName(client),
                        notifyEmail: client.notify_email ?? undefined,
                      });
                      setError(result.success ? null : result.error ?? "Error");
                    })
                  }
                >
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      if (!window.confirm(`¿Archivar ${client.name}?`)) return;
                      const result = await archiveCustomerClient(client.id);
                      setError(result.success ? null : result.error ?? "Error");
                    })
                  }
                >
                  Archivar
                </Button>
              </div>
            ))}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Categorías</h3>
            {categories
              .filter((category) => !category.archived_at)
              .map((category) => (
                <div key={category.id} className="flex gap-2">
                  <Input
                    value={categoryName(category)}
                    onChange={(event) =>
                      setCategoryNames((current) => ({
                        ...current,
                        [category.id]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await updateCategory(category.id, categoryName(category));
                        setError(result.success ? null : result.error ?? "Error");
                      })
                    }
                  >
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        if (!window.confirm(`¿Archivar ${category.name}?`)) return;
                        const result = await archiveCategory(category.id);
                        setError(result.success ? null : result.error ?? "Error");
                      })
                    }
                  >
                    Archivar
                  </Button>
                </div>
              ))}
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Nueva categoría"
              />
              <Button
                type="button"
                disabled={pending || !newCategory.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createCategory(newCategory);
                    if (!result.success) {
                      setError(result.error ?? "Error");
                      return;
                    }
                    setNewCategory("");
                  })
                }
              >
                Añadir
              </Button>
            </div>
          </section>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
