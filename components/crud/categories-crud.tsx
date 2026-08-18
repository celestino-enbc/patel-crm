"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  archiveCategories,
  createCategory,
  deleteCategories,
  deleteCategory,
  unarchiveCategories,
  updateCategory,
} from "@/app/actions/categories";
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
import type { Category } from "@/lib/types";

export function CategoriesCrud({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recordState, setRecordState] = useState<RecordStateFilter>("all");
  const [sort, setSort] = useState<ListSort>("created_desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const filtered = categories.filter(
      (category) =>
        matchesArchivedFilter(category.archived_at, recordState) &&
        (includesNormalized(category.name, query) || includesNormalized(category.slug, query))
    );
    return sortByNameOrCreated(
      filtered,
      sort,
      (category) => category.name,
      (category) => category.created_at
    );
  }, [categories, query, recordState, sort]);

  const visibleIds = rows.map((category) => category.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const selectedCategory = categories.find((category) => category.id === selectedId) ?? null;

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
        title="Categorías"
        onRefresh={() => router.refresh()}
        add={
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar categoría
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
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="archived">Archivadas</SelectItem>
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
          runSelected((count) => confirmArchive(count, "categorías"), archiveCategories, "archivadas")
        }
        onRestore={() =>
          runSelected((count) => confirmRestore(count, "categorías"), unarchiveCategories, "restauradas")
        }
        onDelete={() =>
          runSelected(
            (count) => confirmPermanentDelete(count, "categorías"),
            deleteCategories,
            "eliminadas"
          )
        }
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[560px] text-left text-sm">
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
                {rows.length} de {categories.length}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No hay categorías con esos filtros.
                </td>
              </tr>
            ) : (
              rows.map((category) => (
                <tr
                  key={category.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => setSelectedId(category.id)}
                >
                  <td className="px-4 py-3">
                    <RowCheckbox
                      checked={selected.includes(category.id)}
                      onChange={() => setSelected(toggleSelectedId(selected, category.id))}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td className="px-4 py-3">
                    <RecordStateBadge archived={Boolean(category.archived_at)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{category.slug}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {compactAge(category.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddCategoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        pending={pending}
        startTransition={startTransition}
      />

      <CategorySheet
        category={selectedCategory}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        pending={pending}
        startTransition={startTransition}
      />
    </div>
  );
}

function AddCategoryDialog({
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

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createCategory(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setName("");
      onOpenChange(false);
      toast.success("Categoría creada");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar categoría</DialogTitle>
          <DialogDescription>Clasifica peticiones nuevas en el tablero.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-category">Nombre</Label>
            <Input
              id="new-category"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
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

function CategorySheet({
  category,
  onOpenChange,
  pending,
  startTransition,
}: {
  category: Category | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  return (
    <Sheet open={Boolean(category)} onOpenChange={onOpenChange}>
      <SheetContent>
        {category ? (
          <CategoryForm
            key={category.id}
            category={category}
            pending={pending}
            startTransition={startTransition}
            onDeleted={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  category,
  pending,
  startTransition,
  onDeleted,
}: {
  category: Category;
  pending: boolean;
  startTransition: ReturnType<typeof useTransition>[1];
  onDeleted: () => void;
}) {
  const [name, setName] = useState(category.name);

  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{category.name}</SheetTitle>
        <SheetDescription>{category.slug}</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-6 pb-6">
        <RecordStateBadge archived={Boolean(category.archived_at)} />
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateCategory(category.id, name);
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
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await unarchiveCategories([category.id]);
                  toastBulk(result, "restauradas");
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
                if (!confirmArchive(1, "categoría")) return;
                startTransition(async () => {
                  const result = await archiveCategories([category.id]);
                  toastBulk(result, "archivadas");
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
              if (!confirmPermanentDelete(1, "categoría")) return;
              startTransition(async () => {
                const result = await deleteCategory(category.id);
                if (!result.success) toast.error(result.error);
                else {
                  toast.success("Categoría eliminada");
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
