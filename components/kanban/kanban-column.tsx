"use client";

import { Droppable } from "@hello-pangea/dnd";
import { TaskCard } from "@/components/kanban/task-card";
import { STATUS_COLUMNS } from "@/lib/constants";
import type { TaskBoardItem, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskBoardItem[];
  onOpenTask: (taskId: string) => void;
  showClient: boolean;
}

export function KanbanColumn({ status, tasks, onOpenTask, showClient }: KanbanColumnProps) {
  const column = STATUS_COLUMNS.find((item) => item.id === status);

  if (!column) return null;

  return (
    <section className="flex min-w-[280px] flex-1 flex-col rounded-2xl border bg-card/70">
      <header className={cn("rounded-t-2xl border-b px-4 py-3", column.header)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", column.accent)} />
            <h2 className="text-sm font-semibold">{column.label}</h2>
          </div>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
            {tasks.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{column.description}</p>
      </header>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-[220px] flex-1 flex-col gap-3 p-3",
              snapshot.isDraggingOver && "bg-accent/60"
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onOpen={onOpenTask}
                showClient={showClient}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
}
