import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskAttachment } from "@/lib/types";
import { formatBytes, isImageMime } from "@/lib/utils";

export function AttachmentGallery({ attachments }: { attachments: TaskAttachment[] }) {
  if (attachments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        Aún no hay evidencias adjuntas.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {attachments.map((file) => (
        <li key={file.id} className="overflow-hidden rounded-lg border bg-secondary/30">
          {isImageMime(file.file_type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.file_url} alt={file.file_name} className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 items-center justify-center bg-muted">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.file_name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</p>
            </div>
            <Button asChild size="icon" variant="ghost">
              <a href={file.file_url} target="_blank" rel="noreferrer" download={file.file_name}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
