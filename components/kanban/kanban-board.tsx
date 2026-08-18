"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/app/actions/tasks";
import { BoardFilters, matchesBoardFilters, type BoardFiltersState } from "@/components/kanban/board-filters";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { InviteDialog } from "@/components/clients/invite-dialog";
import { ManageCatalogDialog } from "@/components/clients/manage-catalog-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { STATUS_COLUMNS } from "@/lib/constants";
import type { Category, Client, Profile, TaskBoardItem, TaskStatus } from "@/lib/types";

interface KanbanBoardProps {
  initialTasks: TaskBoardItem[];
  categories: Category[];
  customers: Client[];
  clients: Client[];
  profile: Profile;
}

export function KanbanBoard({
  initialTasks,
  categories,
  customers,
  clients,
  profile,
}: KanbanBoardProps) {
  const isHub = profile.client.kind === "hub";
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState<BoardFiltersState>({
    query: "",
    categoryId: "all",
    clientId: "all",
    assignee: "all",
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const draggedRef = useRef(false);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filtered = useMemo(
    () =>
      tasks.filter((task) =>
        matchesBoardFilters(
          task.title,
          task.description,
          task.category_id,
          task.client_id,
          task.assignee_kind,
          filters
        )
      ),
    [tasks, filters]
  );

  function onDragStart() {
    draggedRef.current = true;
  }

  function onDragEnd(result: DropResult) {
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const nextStatus = destination.droppableId as TaskStatus;
    const previous = tasks;

    setTasks((current) =>
      current.map((task) =>
        task.id === draggableId ? { ...task, status: nextStatus } : task
      )
    );

    startTransition(async () => {
      const response = await updateTaskStatus(draggableId, nextStatus);
      if (!response.success) {
        setTasks(previous);
        toast.error(response.error ?? "No se pudo actualizar el estado.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4">
        <BoardFilters
          categories={categories}
          customers={customers}
          showClientFilter={isHub}
          value={filters}
          onChange={setFilters}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {isHub && <InviteDialog clients={clients} />}
          {isHub && <CreateClientDialog />}
          {isHub && <ManageCatalogDialog customers={customers} categories={categories} />}
          <CreateTaskDialog
            categories={categories}
            customers={customers}
            isHub={isHub}
            defaultClientId={isHub ? customers[0]?.id ?? "" : profile.client_id}
          />
        </div>
      </div>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="kanban-scroll flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.id}
              tasks={filtered.filter((task) => task.status === column.id)}
              showClient={isHub}
              onOpenTask={(taskId) => {
                if (!draggedRef.current) setSelectedTaskId(taskId);
              }}
            />
          ))}
        </div>
      </DragDropContext>
      <TaskDetailSheet
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        showClient={isHub}
        categories={categories}
      />
    </div>
  );
}
