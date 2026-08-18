"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveTask, unarchiveTask, updateTaskStatus } from "@/app/actions/tasks";
import { ModuleHeader } from "@/components/crud/module-header";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABEL, STATUS_COLUMNS } from "@/lib/constants";
import { hubMemberLabel } from "@/lib/team";
import type { Category, Client, HubMember, Profile, TaskBoardItem, TaskStatus } from "@/lib/types";

export function TasksCrud({
  tasks,
  categories,
  customers,
  hubMembers,
  profile,
}: {
  tasks: TaskBoardItem[];
  categories: Category[];
  customers: Client[];
  hubMembers: HubMember[];
  profile: Profile;
}) {
  const isHub = profile.client.kind === "hub";
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!showArchived && task.archived_at) return false;
      if (showArchived && !task.archived_at) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.client.name.toLowerCase().includes(q) ||
        task.category.name.toLowerCase().includes(q)
      );
    });
  }, [tasks, query, showArchived]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        kicker="Módulo"
        title="Peticiones"
        description="Alta, edición, estado y archivo de cada petición. El tablero sigue siendo la vista operativa."
        actions={
          <CreateTaskDialog
            categories={categories}
            customers={customers}
            hubMembers={hubMembers}
            isHub={isHub}
            defaultClientId={isHub ? customers[0]?.id ?? "" : profile.client_id}
            defaultAssigneeUserId={isHub ? profile.id : null}
          />
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar título, cliente o categoría…"
          className="sm:max-w-sm"
        />
        <Button type="button" variant={showArchived ? "secondary" : "outline"} onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Ver activas" : "Ver archivadas"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Título</th>
              {isHub && <th className="px-3 py-3 font-medium">Cliente</th>}
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium">Responsable</th>
              <th className="px-3 py-3 font-medium">Prioridad</th>
              <th className="px-3 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isHub ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                  No hay peticiones en esta vista.
                </td>
              </tr>
            ) : (
              rows.map((task) => (
                <tr key={task.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => setSelectedId(task.id)}>
                      {task.title}
                    </button>
                    <p className="text-xs text-muted-foreground">{task.category.name}</p>
                  </td>
                  {isHub && <td className="px-3 py-3">{task.client.name}</td>}
                  <td className="px-3 py-3">
                    <Select
                      value={task.status}
                      disabled={pending || Boolean(task.archived_at)}
                      onValueChange={(status) =>
                        startTransition(async () => {
                          const result = await updateTaskStatus(task.id, status as TaskStatus);
                          if (!result.success) toast.error(result.error);
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map((column) => (
                          <SelectItem key={column.id} value={column.id}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3">{hubMemberLabel(task.assignee_user)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={task.priority === "high" ? "destructive" : "outline"}>
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(task.id)}>
                        Editar
                      </Button>
                      {task.archived_at ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await unarchiveTask(task.id);
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
                              if (!window.confirm(`¿Archivar “${task.title}”?`)) return;
                              const result = await archiveTask(task.id);
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
              ))
            )}
          </tbody>
        </table>
      </div>
      <TaskDetailSheet
        taskId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        showClient={isHub}
        isHub={isHub}
        categories={categories}
        hubMembers={hubMembers}
      />
    </div>
  );
}
