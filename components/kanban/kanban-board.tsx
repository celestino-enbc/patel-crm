"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/app/actions/tasks";
import { BoardFilters } from "@/components/kanban/board-filters";
import { matchesBoardFilters, type BoardFiltersState } from "@/lib/board-filters";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { STATUS_COLUMNS } from "@/lib/constants";
import type { Category, Client, HubMember, Profile, TaskBoardItem, TaskStatus } from "@/lib/types";

interface KanbanBoardProps {
  initialTasks: TaskBoardItem[];
  categories: Category[];
  customers: Client[];
  hubMembers: HubMember[];
  profile: Profile;
}

export function KanbanBoard({
  initialTasks,
  categories,
  customers,
  hubMembers,
  profile,
}: KanbanBoardProps) {
  const isHub = profile.client.kind === "hub";
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState<BoardFiltersState>({
    query: "",
    categoryId: "all",
    clientId: "all",
    assignee: "all",
    responsableId: "all",
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const draggedRef = useRef(false);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filtered = useMemo(
    () => tasks.filter((task) => matchesBoardFilters(task, filters)),
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
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-3 sm:p-4">
        <BoardFilters
          categories={categories}
          customers={customers}
          hubMembers={hubMembers}
          showClientFilter={isHub}
          currentUserId={profile.id}
          value={filters}
          onChange={setFilters}
        />
        <div className="flex justify-end">
          <CreateTaskDialog
            categories={categories}
            customers={customers}
            hubMembers={hubMembers}
            isHub={isHub}
            defaultClientId={isHub ? customers[0]?.id ?? "" : profile.client_id}
            defaultAssigneeUserId={isHub ? profile.id : null}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground sm:hidden">Desliza el tablero hacia los lados para ver las columnas.</p>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="kanban-scroll -mx-3 flex gap-3 overflow-x-auto px-3 pb-4 sm:mx-0 sm:gap-4 sm:px-0">
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
        isHub={isHub}
        categories={categories}
        hubMembers={hubMembers}
      />
    </div>
  );
}
