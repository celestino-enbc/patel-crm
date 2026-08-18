"use client";

import { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";
import { ACCEPTED_EVIDENCE_TYPES, MAX_EVIDENCE_SIZE } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ files, onChange, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const mergeFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next = Array.from(incoming).filter((file) => {
        return (
          ACCEPTED_EVIDENCE_TYPES.includes(
            file.type as (typeof ACCEPTED_EVIDENCE_TYPES)[number]
          ) && file.size <= MAX_EVIDENCE_SIZE
        );
      });
      const unique = [...files];
      for (const file of next) {
        if (!unique.some((item) => item.name === file.name && item.size === file.size)) {
          unique.push(file);
        }
      }
      onChange(unique);
    },
    [files, onChange]
  );

  return (
    <div className="space-y-2">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) mergeFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
          isDragging ? "border-primary bg-accent" : "border-border bg-secondary/40",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Arrastra evidencias o haz clic para seleccionar</p>
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, GIF o PDF · máx. 10 MB</p>
        <input
          type="file"
          multiple
          accept={ACCEPTED_EVIDENCE_TYPES.join(",")}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) mergeFiles(event.target.files);
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center justify-between">
              <span className="truncate pr-3">{file.name}</span>
              <span>{formatBytes(file.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
