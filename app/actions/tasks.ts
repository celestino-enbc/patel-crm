"use server";

import { revalidatePath } from "next/cache";
import { notifyNewTask, notifyStatusChange } from "@/lib/email";
import { reportOperationalIssue } from "@/lib/ops-alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SIGNED_URL_TTL_SECONDS, isOverdue } from "@/lib/tasks";
import { getCurrentProfile } from "@/app/actions/auth";
import { normalizeAssigneeUserId } from "@/lib/team";
import type {
  ActionResult,
  AssigneeKind,
  Category,
  Client,
  CreateTaskInput,
  HubMember,
  Task,
  TaskBoardItem,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "@/lib/types";
import { ASSIGNEE_KINDS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

function isAssigneeKind(value: string): value is AssigneeKind {
  return (ASSIGNEE_KINDS as readonly string[]).includes(value);
}

function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

async function signAttachments(
  supabase: ReturnType<typeof createClient>,
  attachments: Task["attachments"] | null | undefined
) {
  const rows = attachments ?? [];
  return Promise.all(
    rows.map(async (attachment) => {
      const { data } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(attachment.file_path, SIGNED_URL_TTL_SECONDS);
      return { ...attachment, file_url: data?.signedUrl ?? "" };
    })
  );
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function asHubMember(value: unknown): HubMember | null {
  const row = unwrap(value as HubMember | HubMember[] | null);
  if (!row?.id) return null;
  return { id: row.id, full_name: row.full_name, email: row.email };
}

async function resolveHubAssignee(
  supabase: ReturnType<typeof createClient>,
  assigneeUserId: string | null | undefined,
  actorIsHub: boolean
): Promise<ActionResult<string | null>> {
  if (!actorIsHub) {
    return { success: true, data: null };
  }

  const normalized = normalizeAssigneeUserId(assigneeUserId);
  if (!normalized) {
    return { success: true, data: null };
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, client:clients (kind)")
    .eq("id", normalized)
    .maybeSingle();

  const client = unwrap(data?.client as { kind: string } | { kind: string }[] | null);
  if (!data || client?.kind !== "hub") {
    return { success: false, error: "El responsable debe ser un miembro de VisorLab." };
  }

  return { success: true, data: normalized };
}

async function getHubClient() {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, slug, kind, notify_email")
    .eq("kind", "hub")
    .maybeSingle();
  return data as Pick<Client, "id" | "name" | "slug" | "kind" | "notify_email"> | null;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Category[];
}

export async function getBoardTasks(): Promise<TaskBoardItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      category_id,
      client_id,
      status,
      assignee_kind,
      assignee_user_id,
      assignee_user:profiles!assignee_user_id (id, full_name, email),
      priority,
      due_date,
      archived_at,
      created_by,
      created_at,
      updated_at,
      category:categories (id, name, slug),
      client:clients (id, name, slug, kind),
      comments (id),
      attachments:task_attachments (id)
    `
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const category = unwrap(row.category) ?? { id: "", name: "Sin categoría", slug: "" };
    const client = unwrap(row.client) ?? { id: "", name: "Cliente", slug: "", kind: "client" as const };

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category_id: row.category_id,
      client_id: row.client_id,
      status: row.status,
      assignee_kind: row.assignee_kind,
      assignee_user_id: row.assignee_user_id ?? null,
      assignee_user: asHubMember(row.assignee_user),
      priority: row.priority,
      due_date: row.due_date,
      archived_at: row.archived_at,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category,
      client,
      comment_count: Array.isArray(row.comments) ? row.comments.length : 0,
      attachment_count: Array.isArray(row.attachments) ? row.attachments.length : 0,
    };
  }) as TaskBoardItem[];
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      category_id,
      client_id,
      status,
      assignee_kind,
      assignee_user_id,
      assignee_user:profiles!assignee_user_id (id, full_name, email),
      priority,
      due_date,
      archived_at,
      created_by,
      created_at,
      updated_at,
      category:categories (*),
      client:clients (id, name, slug, kind),
      creator:profiles!created_by (
        id, full_name, email, client_id,
        client:clients (id, name, slug, kind)
      ),
      attachments:task_attachments (*),
      comments (
        id,
        task_id,
        user_id,
        content,
        created_at,
        author:profiles!user_id (
          id, full_name, email, client_id,
          client:clients (id, name, slug, kind)
        )
      )
    `
    )
    .eq("id", taskId)
    .order("created_at", { referencedTable: "comments", ascending: true })
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const comments = (data.comments ?? []).map((comment) => {
    const author = unwrap(comment.author);
    const authorClient = unwrap(author?.client);
    return {
      ...comment,
      author: author
        ? { ...author, client: authorClient }
        : author,
    };
  });

  const creator = unwrap(data.creator);
  const creatorClient = unwrap(creator?.client);
  const attachments = await signAttachments(supabase, data.attachments ?? []);

  return {
    ...data,
    assignee_user_id: data.assignee_user_id ?? null,
    assignee_user: asHubMember(data.assignee_user),
    category: unwrap(data.category),
    client: unwrap(data.client),
    creator: creator ? { ...creator, client: creatorClient } : creator,
    attachments,
    comments,
    comment_count: comments.length,
    attachment_count: attachments.length,
  } as Task;
}

export async function createTask(
  input: CreateTaskInput
): Promise<ActionResult<{ id: string }>> {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    return { success: false, error: "El título es obligatorio." };
  }
  if (!input.categoryId) {
    return { success: false, error: "Selecciona una categoría." };
  }
  if (!isAssigneeKind(input.assigneeKind)) {
    return { success: false, error: "Selecciona un responsable válido." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Debes iniciar sesión." };
  }

  const clientId = profile.client.kind === "hub" ? input.clientId : profile.client_id;
  if (!clientId) {
    return { success: false, error: "Selecciona el cliente de la petición." };
  }

  const supabase = createClient();
  const { data: customer } = await supabase
    .from("clients")
    .select("id, name, kind, notify_email")
    .eq("id", clientId)
    .maybeSingle();

  if (!customer || customer.kind !== "client") {
    return { success: false, error: "La petición debe pertenecer a un cliente." };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("name")
    .eq("id", input.categoryId)
    .single();

  const assigneeUser = await resolveHubAssignee(
    supabase,
    input.assigneeUserId === undefined && profile.client.kind === "hub"
      ? profile.id
      : input.assigneeUserId,
    profile.client.kind === "hub"
  );
  if (!assigneeUser.success) {
    return { success: false, error: assigneeUser.error };
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      category_id: input.categoryId,
      client_id: clientId,
      assignee_kind: input.assigneeKind,
      assignee_user_id: assigneeUser.data ?? null,
      created_by: profile.id,
      status: "solicitado",
      priority: input.priority && isTaskPriority(input.priority) ? input.priority : "medium",
      due_date: input.dueDate || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "No se pudo crear la petición." };
  }

  const hub = await getHubClient();

  try {
    await notifyNewTask({
      title,
      assigneeKind: input.assigneeKind,
      actorName: profile.full_name,
      actorKind: profile.client.kind,
      actorClientName: profile.client.name,
      clientName: customer.name,
      clientNotifyEmail: customer.notify_email,
      hubNotifyEmail: hub?.notify_email ?? null,
      categoryName: category?.name ?? "Sin categoría",
    });
  } catch (mailError) {
    await reportOperationalIssue({
      kind: "smtp",
      message: `Falló el correo de nueva petición: ${title}`,
      error: mailError,
    });
  }

  revalidatePath("/dashboard");
  return { success: true, data: { id: data.id } };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ActionResult> {
  if (!isTaskStatus(status)) {
    return { success: false, error: "Estado inválido." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Debes iniciar sesión." };
  }

  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id, title, status, client:clients (name, notify_email)")
    .eq("id", taskId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "No se encontró la petición." };
  }

  if (existing.status === status) {
    return { success: true };
  }

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  const customer = unwrap(existing.client);
  const hub = await getHubClient();

  try {
    await notifyStatusChange({
      title: existing.title,
      status,
      actorName: profile.full_name,
      actorKind: profile.client.kind,
      actorClientName: profile.client.name,
      clientName: customer?.name ?? "Cliente",
      clientNotifyEmail: customer?.notify_email ?? null,
      hubNotifyEmail: hub?.notify_email ?? null,
    });
  } catch (mailError) {
    await reportOperationalIssue({
      kind: "smtp",
      message: `Falló el correo de cambio de estado: ${existing.title}`,
      error: mailError,
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult> {
  if (!input.title.trim()) {
    return { success: false, error: "El título es obligatorio." };
  }
  if (!isAssigneeKind(input.assigneeKind) || !isTaskPriority(input.priority)) {
    return { success: false, error: "Datos inválidos." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Debes iniciar sesión." };
  }

  const supabase = createClient();
  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    category_id: input.categoryId,
    assignee_kind: input.assigneeKind,
    priority: input.priority,
    due_date: input.dueDate || null,
  };

  if (profile.client.kind === "hub") {
    const assigneeUser = await resolveHubAssignee(supabase, input.assigneeUserId, true);
    if (!assigneeUser.success) {
      return { success: false, error: assigneeUser.error };
    }
    patch.assignee_user_id = assigneeUser.data ?? null;
  }

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", input.id)
    .is("archived_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveTask(taskId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Debes iniciar sesión." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function flagOverdueTasks(): Promise<{ count: number }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tasks")
    .select("id, title, due_date, status, archived_at, overdue_alerted_at, client:clients (name)")
    .is("archived_at", null)
    .not("due_date", "is", null);

  const overdue = (data ?? []).filter(
    (row) =>
      isOverdue({ due_date: row.due_date, status: row.status, archived_at: row.archived_at }) &&
      !row.overdue_alerted_at
  );

  for (const task of overdue) {
    const client = unwrap(task.client as { name: string } | { name: string }[]);
    await reportOperationalIssue({
      kind: "overdue",
      message: `Petición vencida (${client?.name ?? "cliente"}): ${task.title}`,
      details: { taskId: task.id, dueDate: task.due_date },
    });
    await admin
      .from("tasks")
      .update({ overdue_alerted_at: new Date().toISOString() })
      .eq("id", task.id);
  }

  return { count: overdue.length };
}
