"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/app/actions/tasks";
import { uploadTaskAttachments } from "@/app/actions/attachments";
import { FileDropzone } from "@/components/tasks/file-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import type { AssigneeKind, Category, Client, HubMember, TaskPriority } from "@/lib/types";

interface CreateTaskDialogProps {
  categories: Category[];
  customers: Client[];
  hubMembers: HubMember[];
  isHub: boolean;
  defaultClientId: string;
  defaultAssigneeUserId: string | null;
}

export function CreateTaskDialog({
  categories,
  customers,
  hubMembers,
  isHub,
  defaultClientId,
  defaultAssigneeUserId,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [clientId, setClientId] = useState(defaultClientId);
  const [assigneeKind, setAssigneeKind] = useState<AssigneeKind>("hub");
  const [assigneeUserId, setAssigneeUserId] = useState(defaultAssigneeUserId ?? "unassigned");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setCategoryId(categories[0]?.id ?? "");
    setClientId(defaultClientId);
    setAssigneeKind("hub");
    setAssigneeUserId(defaultAssigneeUserId ?? "unassigned");
    setPriority("medium");
    setDueDate("");
    setFiles([]);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const created = await createTask({
        title,
        description,
        categoryId,
        clientId,
        assigneeKind,
        assigneeUserId: isHub ? assigneeUserId : null,
        priority,
        dueDate: dueDate || null,
      });

      if (!created.success || !created.data) {
        setError(created.error ?? "No se pudo crear la petición.");
        return;
      }

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        const uploaded = await uploadTaskAttachments(created.data.id, formData);
        if (!uploaded.success) {
          setError(uploaded.error ?? "La petición se creó, pero falló la subida de archivos.");
          return;
        }
      }

      reset();
      setOpen(false);
    });
  }

  const selectedCustomer = customers.find((client) => client.id === clientId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nueva petición
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear petición</DialogTitle>
          <DialogDescription>
            {isHub
              ? "Asigna la petición a un cliente. Visor la verá en el hub; el cliente solo en su tablero."
              : "La petición quedará en el tablero de tu cliente para revisión con Visor."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isHub && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
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
          <div className="space-y-2">
            <Label htmlFor="title">Título / petición</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. El correo de confirmación no llega"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción / notas</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexto, pasos para reproducir, impacto…"
            />
          </div>
          <div className="space-y-2">
            <Label>Turno</Label>
            <Select
              value={assigneeKind}
              onValueChange={(value) => setAssigneeKind(value as AssigneeKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hub">VisorLab</SelectItem>
                <SelectItem value="client">{selectedCustomer?.name ?? "Cliente"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isHub && (
            <div className="space-y-2">
              <Label>Responsable VisorLab</Label>
              <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {hubMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
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
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha límite</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Evidencias</Label>
            <FileDropzone files={files} onChange={setFiles} disabled={pending} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || (isHub && !clientId)}>
              {pending ? "Guardando…" : "Crear petición"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
