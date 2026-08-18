"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState, useTransition } from "react";
import { archiveTask, getTaskById, updateTask } from "@/app/actions/tasks";
import { uploadTaskAttachments } from "@/app/actions/attachments";
import { CommentThread } from "@/components/comments/comment-thread";
import { AssigneeBadge, ClientBadge } from "@/components/layout/org-badge";
import { AttachmentGallery } from "@/components/tasks/attachment-gallery";
import { FileDropzone } from "@/components/tasks/file-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABEL, STATUS_COLUMNS } from "@/lib/constants";
import { isOverdue } from "@/lib/tasks";
import type { AssigneeKind, Category, Task, TaskPriority } from "@/lib/types";

interface TaskDetailSheetProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showClient: boolean;
  categories: Category[];
}

export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  showClient,
  categories,
}: TaskDetailSheetProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assigneeKind, setAssigneeKind] = useState<AssigneeKind>("hub");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !taskId) {
      setTask(null);
      setEditing(false);
      setFiles([]);
      setError(null);
      return;
    }

    startTransition(async () => {
      const data = await getTaskById(taskId);
      setTask(data);
      if (data) {
        setTitle(data.title);
        setDescription(data.description);
        setCategoryId(data.category_id);
        setAssigneeKind(data.assignee_kind);
        setPriority(data.priority);
        setDueDate(data.due_date ? data.due_date.slice(0, 10) : "");
      }
    });
  }, [open, taskId]);

  function handleUpload() {
    if (!task || files.length === 0) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const result = await uploadTaskAttachments(task.id, formData);
      if (!result.success || !result.data) {
        setError(result.error ?? "No se pudieron subir los archivos.");
        return;
      }
      const uploaded = result.data;
      setTask((current) =>
        current
          ? {
              ...current,
              attachments: [...current.attachments, ...uploaded],
              attachment_count: current.attachment_count + uploaded.length,
            }
          : current
      );
      setFiles([]);
    });
  }

  function handleSave() {
    if (!task) return;
    startTransition(async () => {
      const result = await updateTask({
        id: task.id,
        title,
        description,
        categoryId,
        assigneeKind,
        priority,
        dueDate: dueDate || null,
      });
      if (!result.success) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }
      const data = await getTaskById(task.id);
      setTask(data);
      setEditing(false);
    });
  }

  function handleArchive() {
    if (!task) return;
    if (!window.confirm("¿Archivar esta petición? Dejará de verse en el tablero.")) return;
    startTransition(async () => {
      const result = await archiveTask(task.id);
      if (!result.success) {
        setError(result.error ?? "No se pudo archivar.");
        return;
      }
      onOpenChange(false);
    });
  }

  const statusLabel = STATUS_COLUMNS.find((column) => column.id === task?.status)?.label;
  const overdue = task ? isOverdue(task) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {!task ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {pending ? "Cargando petición…" : "Selecciona una tarjeta del tablero."}
          </div>
        ) : (
          <>
            <SheetHeader className="pr-8">
              <SheetTitle>{task.title}</SheetTitle>
              <SheetDescription>
                Creada el{" "}
                {format(new Date(task.created_at), "d MMM yyyy, HH:mm", { locale: es })} por{" "}
                {task.creator.full_name}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-6 pb-8">
              <div className="flex flex-wrap gap-2">
                {showClient && <ClientBadge name={task.client.name} slug={task.client.slug} />}
                <Badge variant="secondary">{task.category.name}</Badge>
                <AssigneeBadge kind={task.assignee_kind} clientName={task.client.name} />
                <Badge variant="outline">{statusLabel}</Badge>
                <Badge variant={task.priority === "high" ? "destructive" : "outline"}>
                  {PRIORITY_LABEL[task.priority]}
                </Badge>
                {task.due_date && (
                  <Badge variant={overdue ? "destructive" : "outline"}>
                    {overdue ? "Vencida · " : "Límite · "}
                    {format(new Date(task.due_date), "d MMM yyyy", { locale: es })}
                  </Badge>
                )}
              </div>
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Responsable</Label>
                      <Select
                        value={assigneeKind}
                        onValueChange={(value) => setAssigneeKind(value as AssigneeKind)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hub">Visor</SelectItem>
                          <SelectItem value="client">{task.client.name}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select
                        value={priority}
                        onValueChange={(value) => setPriority(value as TaskPriority)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baja</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha límite</Label>
                    <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleSave} disabled={pending}>
                      Guardar
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Descripción</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {task.description || "Sin notas adicionales."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                      Editar
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={handleArchive}>
                      Archivar
                    </Button>
                  </div>
                </>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Separator />
              <div>
                <h3 className="mb-3 text-sm font-semibold">Evidencias</h3>
                <AttachmentGallery attachments={task.attachments} />
                <div className="mt-3 space-y-2">
                  <FileDropzone files={files} onChange={setFiles} disabled={pending} />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUpload}
                    disabled={pending || files.length === 0}
                  >
                    Adjuntar evidencias
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="min-h-[280px]">
                <h3 className="mb-3 text-sm font-semibold">Comentarios</h3>
                <CommentThread taskId={task.id} initialComments={task.comments} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
