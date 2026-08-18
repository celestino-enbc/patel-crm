"use server";

import { revalidatePath } from "next/cache";
import { ACCEPTED_EVIDENCE_TYPES, MAX_EVIDENCE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, TaskAttachment } from "@/lib/types";

const ACCEPTED = new Set<string>(ACCEPTED_EVIDENCE_TYPES);

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export async function uploadTaskAttachments(
  taskId: string,
  formData: FormData
): Promise<ActionResult<TaskAttachment[]>> {
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return { success: false, error: "Selecciona al menos un archivo." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión." };
  }

  const uploaded: TaskAttachment[] = [];

  for (const file of files) {
    if (!ACCEPTED.has(file.type)) {
      return {
        success: false,
        error: `Tipo no permitido: ${file.name}. Usa JPG, PNG, WEBP, GIF o PDF.`,
      };
    }

    if (file.size > MAX_EVIDENCE_SIZE) {
      return { success: false, error: `${file.name} supera el límite de 10 MB.` };
    }

    const path = `${taskId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("evidencias")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("evidencias")
      .createSignedUrl(path, 120);

    if (signError) {
      return { success: false, error: signError.message };
    }

    const { data, error } = await supabase
      .from("task_attachments")
      .insert({
        task_id: taskId,
        file_name: file.name,
        file_path: path,
        file_url: signed?.signedUrl ?? "",
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "No se pudo guardar el adjunto." };
    }

    uploaded.push(data as TaskAttachment);
  }

  revalidatePath("/dashboard");
  return { success: true, data: uploaded };
}
