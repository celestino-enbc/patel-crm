"use client";

import type { ReactNode } from "react";
import { Home, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export function ListToolbar({
  title,
  onRefresh,
  add,
}: {
  title: string;
  onRefresh: () => void;
  add?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>/</span>
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" aria-label="Actualizar" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        {add}
      </div>
    </div>
  );
}

export function FilterChip({ count, onClear }: { count: number; onClear: () => void }) {
  if (count <= 0) return null;
  return (
    <Button type="button" variant="secondary" size="sm" className="h-9" onClick={onClear}>
      Filtros {count}
      <X className="ml-1 h-3.5 w-3.5" />
    </Button>
  );
}

export function BulkBar({
  count,
  pending,
  onClear,
  onArchive,
  onRestore,
  onDelete,
}: {
  count: number;
  pending: boolean;
  onClear: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm">
      <span className="font-medium">{count} seleccionados</span>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onArchive}>
        Archivar
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onRestore}>
        Restaurar
      </Button>
      <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={onDelete}>
        Eliminar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onClear}>
        Quitar selección
      </Button>
    </div>
  );
}

export function RecordStateBadge({ archived }: { archived: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        archived ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"
      )}
    >
      {archived ? "Archivado" : "Activo"}
    </span>
  );
}

export function toastBulk(
  result: ActionResult<{ ok: number; failed: number }>,
  done: string
) {
  if (!result.success) {
    toast.error(result.error);
    return;
  }
  const ok = result.data?.ok ?? 0;
  const failed = result.data?.failed ?? 0;
  if (failed > 0) toast.warning(`${ok} ${done}. ${failed} no se pudieron.`);
  else toast.success(`${ok} ${done}.`);
}

export function SelectAllCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-foreground"
      checked={checked}
      onChange={onChange}
      aria-label="Seleccionar todos"
    />
  );
}

export function RowCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-foreground"
      checked={checked}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      aria-label="Seleccionar fila"
    />
  );
}
