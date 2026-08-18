"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  archiveCategory,
  createCategory,
  unarchiveCategory,
  updateCategory,
} from "@/app/actions/categories";
import { ModuleHeader } from "@/components/crud/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/types";

export function CategoriesCrud({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createCategory(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setName("");
      toast.success("Categoría creada");
    });
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        kicker="Módulo"
        title="Categorías"
        description="Clasifican las peticiones en el tablero. Archivar oculta la categoría en altas nuevas."
      />
      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="new-category">Nueva categoría</Label>
          <Input
            id="new-category"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Diseño, Desarrollo, Contenido"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          Crear
        </Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Nombre</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const value = edits[category.id] ?? category.name;
              return (
                <tr key={category.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <Input
                      value={value}
                      onChange={(event) =>
                        setEdits((current) => ({ ...current, [category.id]: event.target.value }))
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{category.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={category.archived_at ? "outline" : "secondary"}>
                      {category.archived_at ? "Archivada" : "Activa"}
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
                            const result = await updateCategory(category.id, value);
                            if (!result.success) toast.error(result.error);
                            else toast.success("Guardada");
                          })
                        }
                      >
                        Guardar
                      </Button>
                      {category.archived_at ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await unarchiveCategory(category.id);
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
                              if (!window.confirm(`¿Archivar ${category.name}?`)) return;
                              const result = await archiveCategory(category.id);
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
