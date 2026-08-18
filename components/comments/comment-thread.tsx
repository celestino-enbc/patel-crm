"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Send } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { addComment } from "@/app/actions/comments";
import { ClientBadge } from "@/components/layout/org-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Comment, CommentAuthor } from "@/lib/types";

interface CommentThreadProps {
  taskId: string;
  initialComments: Comment[];
}

export function CommentThread({ taskId, initialComments }: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            task_id: string;
            user_id: string;
            content: string;
            created_at: string;
          };

          const { data: author } = await supabase
            .from("profiles")
            .select("id, full_name, email, client_id, client:clients (id, name, slug, kind)")
            .eq("id", row.user_id)
            .single();

          const clientRaw = author?.client as CommentAuthor["client"] | CommentAuthor["client"][] | null;
          const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;

          const next: Comment = {
            ...row,
            author: author
              ? {
                  id: author.id,
                  full_name: author.full_name,
                  email: author.email,
                  client_id: author.client_id,
                  client: client ?? { id: "", name: "Equipo", slug: "", kind: "client" },
                }
              : {
                  id: row.user_id,
                  full_name: "Usuario",
                  email: "",
                  client_id: "",
                  client: { id: "", name: "Equipo", slug: "", kind: "client" },
                },
          };

          setComments((current) => {
            if (current.some((item) => item.id === next.id)) return current;
            return [...current, next];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [taskId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addComment(taskId, content);
      if (!result.success || !result.data) {
        setError(result.error ?? "No se pudo publicar.");
        return;
      }
      const created = result.data;
      setContent("");
      setComments((current) => {
        if (current.some((item) => item.id === created.id)) return current;
        return [...current, created];
      });
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sé el primero en comentar esta petición.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border bg-secondary/40 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{comment.author.full_name}</p>
                  <ClientBadge name={comment.author.client.name} slug={comment.author.client.slug} />
                </div>
                <time className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
            </article>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t pt-4">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escribe un comentario para el otro equipo…"
          rows={3}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !content.trim()}>
            <Send className="h-4 w-4" />
            {pending ? "Publicando…" : "Comentar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
