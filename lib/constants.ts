import type { AssigneeKind, TaskStatus } from "@/lib/types";

export const STATUS_COLUMNS: {
  id: TaskStatus;
  label: string;
  description: string;
  accent: string;
  header: string;
}[] = [
  {
    id: "solicitado",
    label: "Solicitado",
    description: "Peticiones nuevas por atender",
    accent: "bg-sky-500",
    header: "border-sky-200 bg-sky-50",
  },
  {
    id: "en_revision",
    label: "En revisión",
    description: "En análisis o en curso",
    accent: "bg-amber-500",
    header: "border-amber-200 bg-amber-50",
  },
  {
    id: "hecho",
    label: "Hecho",
    description: "Resueltas y entregadas",
    accent: "bg-emerald-500",
    header: "border-emerald-200 bg-emerald-50",
  },
  {
    id: "quitar",
    label: "Quitar",
    description: "Descartadas o fuera de alcance",
    accent: "bg-slate-400",
    header: "border-slate-200 bg-slate-50",
  },
];

const CLIENT_TONES = [
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
] as const;

export const HUB_BADGE_CLASS = "bg-blue-100 text-blue-800 border-blue-200";

export function clientBadgeClass(slug: string): string {
  if (slug === "visor") return HUB_BADGE_CLASS;
  let hash = 0;
  for (const char of slug) {
    hash = (hash + char.charCodeAt(0)) % CLIENT_TONES.length;
  }
  return CLIENT_TONES[hash] ?? CLIENT_TONES[0];
}

export function assigneeLabel(kind: AssigneeKind, clientName: string): string {
  return kind === "hub" ? "VisorLab" : clientName;
}

export const PRIORITY_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const ACCEPTED_EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;
