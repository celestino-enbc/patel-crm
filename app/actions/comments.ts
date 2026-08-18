"use server";

import { refreshDashboard } from "@/lib/dashboard";
import { notifyNewComment } from "@/lib/email";
import { reportOperationalIssue } from "@/lib/ops-alerts";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/auth";
import type { ActionResult, Comment } from "@/lib/types";

const COMMENT_SELECT = `
  id,
  task_id,
  user_id,
  content,
  created_at,
  author:profiles!user_id (
    id, full_name, email, client_id,
    client:clients (id, name, slug, kind)
  )
`;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapComment(row: Record<string, unknown>): Comment {
  const author = unwrap(row.author as Comment["author"] | Comment["author"][]);
  const client = unwrap(author?.client);
  const fallbackAuthor: Comment["author"] = {
    id: String(row.user_id ?? ""),
    full_name: "Usuario",
    email: "",
    client_id: "",
    client: { id: "", name: "Equipo", slug: "", kind: "client" },
  };

  return {
    id: String(row.id),
    task_id: String(row.task_id),
    user_id: String(row.user_id),
    content: String(row.content),
    created_at: String(row.created_at),
    author: author
      ? {
          ...author,
          client: client ?? fallbackAuthor.client,
        }
      : fallbackAuthor,
  };
}

export async function getComments(taskId: string): Promise<Comment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapComment(row as Record<string, unknown>));
}

export async function addComment(
  taskId: string,
  content: string
): Promise<ActionResult<Comment>> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "El comentario no puede estar vacío." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Debes iniciar sesión." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      task_id: taskId,
      user_id: profile.id,
      content: trimmed,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "No se pudo publicar el comentario." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title, client:clients (name, notify_email)")
    .eq("id", taskId)
    .single();

  const { data: hub } = await supabase
    .from("clients")
    .select("notify_email")
    .eq("kind", "hub")
    .maybeSingle();

  const customer = unwrap(
    task?.client as { name: string; notify_email: string | null } | { name: string; notify_email: string | null }[]
  );

  try {
    await notifyNewComment({
      title: task?.title ?? "Petición",
      comment: trimmed,
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
      message: `Falló el correo de comentario: ${task?.title ?? "Petición"}`,
      error: mailError,
    });
  }

  refreshDashboard();
  return { success: true, data: mapComment(data as Record<string, unknown>) };
}
