"use client";

import { CalendarClock, MessageSquare, Paperclip } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { AssigneeBadge, ClientBadge } from "@/components/layout/org-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRIORITY_LABEL } from "@/lib/constants";
import { isOverdue } from "@/lib/tasks";
import type { TaskBoardItem } from "@/lib/types";

interface TaskCardProps {
  task: TaskBoardItem;
  index: number;
  onOpen: (taskId: string) => void;
  showClient: boolean;
}

export function TaskCard({ task, index, onOpen, showClient }: TaskCardProps) {
  const overdue = isOverdue(task);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task.id)}
          className={`cursor-pointer p-3 transition-shadow hover:shadow-md ${
            snapshot.isDragging ? "rotate-1 shadow-lg" : ""
          } ${overdue ? "border-destructive/50" : ""}`}
        >
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {showClient && <ClientBadge name={task.client.name} slug={task.client.slug} />}
            <Badge variant="secondary">{task.category.name}</Badge>
            <AssigneeBadge kind={task.assignee_kind} clientName={task.client.name} />
            {task.priority === "high" && (
              <Badge variant="destructive">{PRIORITY_LABEL.high}</Badge>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {task.comment_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              {task.attachment_count}
            </span>
            {task.due_date && (
              <span
                className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {new Date(task.due_date).toLocaleDateString("es")}
                {overdue ? " · vencida" : ""}
              </span>
            )}
          </div>
        </Card>
      )}
    </Draggable>
  );
}
