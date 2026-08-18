"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  archiveTasks,
  deleteTasks,
  unarchiveTasks,
  updateTaskStatus,
} from "@/app/actions/tasks";
import {
  BulkBar,
  FilterChip,
  ListToolbar,
  RecordStateBadge,
  RowCheckbox,
  SelectAllCheckbox,
  toastBulk,
} from "@/components/crud/list-view";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABEL, STATUS_COLUMNS } from "@/lib/constants";
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
  const router = useRouter();
  const isHub = profile.client.kind === "hub";
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("all");
  const [status, setStatus] = useState("all");
  const [recordState, setRecordState] = useState<RecordStateFilter>("all");
  const [sort, setSort] = useState<ListSort>("created_desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (!matchesArchivedFilter(task.archived_at, recordState)) return false;
      if (clientId !== "all" && task.client_id !== clientId) return false;
      if (status !== "all" && task.status !== status) return false;
      return (
        includesNormalized(task.title, query) ||
        includesNormalized(task.client.name, query) ||
        includesNormalized(task.category.name, query)
      );
    });
    return sortByNameOrCreated(filtered, sort, (task) => task.title, (task) => task.created_at);
  }, [tasks, query, clientId, status, recordState, sort]);

  const visibleIds = rows.map((task) => task.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const filterCount = countFilledFilters([query, clientId, status, recordState]);

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
        title="Peticiones"
        onRefresh={() => router.refresh()}
        add={
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

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Título"
          className="h-9 w-44"
        />
        {isHub ? (
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cliente</SelectItem>
              {customers.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado</SelectItem>
            {STATUS_COLUMNS.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={recordState} onValueChange={(value) => setRecordState(value as RecordStateFilter)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="archived">Archivados</SelectItem>
          </SelectContent>
        </Select>
        <FilterChip
          count={filterCount}
          onClear={() => {
            setQuery("");
            setClientId("all");
            setStatus("all");
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
          runSelected((count) => confirmArchive(count, "peticiones"), archiveTasks, "archivadas")
        }
        onRestore={() =>
          runSelected((count) => confirmRestore(count, "peticiones"), unarchiveTasks, "restauradas")
        }
        onDelete={() =>
          runSelected((count) => confirmPermanentDelete(count, "peticiones"), deleteTasks, "eliminadas")
        }
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b text-xs font-medium text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <SelectAllCheckbox
                  checked={allVisibleSelected}
                  onChange={() => setSelected(toggleVisibleSelection(selected, visibleIds))}
                />
              </th>
              <th className="px-4 py-2.5">Título</th>
              <th className="px-4 py-2.5">Estado</th>
              {isHub ? <th className="px-4 py-2.5">Cliente</th> : null}
              <th className="px-4 py-2.5">Responsable</th>
              <th className="px-4 py-2.5 text-right font-normal">
                {rows.length} de {tasks.length}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isHub ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">
                  No hay peticiones con esos filtros.
                </td>
              </tr>
            ) : (
              rows.map((task) => (
                <tr
                  key={task.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => setSelectedId(task.id)}
                >
                  <td className="px-4 py-3">
                    <RowCheckbox
                      checked={selected.includes(task.id)}
                      onChange={() => setSelected(toggleSelectedId(selected, task.id))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.category.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <RecordStateBadge archived={Boolean(task.archived_at)} />
                      <Select
                        value={task.status}
                        disabled={pending || Boolean(task.archived_at)}
                        onValueChange={(next) =>
                          startTransition(async () => {
                            const result = await updateTaskStatus(task.id, next as TaskStatus);
                            if (!result.success) toast.error(result.error);
                          })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-[130px]"
                          onClick={(event) => event.stopPropagation()}
                        >
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
                    </div>
                  </td>
                  {isHub ? <td className="px-4 py-3">{task.client.name}</td> : null}
                  <td className="px-4 py-3">
                    {hubMemberLabel(task.assignee_user)}
                    <Badge variant="outline" className="ml-2">
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {compactAge(task.created_at)}
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
