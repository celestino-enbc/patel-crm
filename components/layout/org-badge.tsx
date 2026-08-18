import { Badge } from "@/components/ui/badge";
import { clientBadgeClass, HUB_BADGE_CLASS } from "@/lib/constants";
import type { AssigneeKind, ClientKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClientBadge({
  name,
  slug,
  className,
}: {
  name: string;
  slug: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(clientBadgeClass(slug), className)}>
      {name}
    </Badge>
  );
}

export function AssigneeBadge({
  kind,
  clientName,
  className,
}: {
  kind: AssigneeKind;
  clientName: string;
  className?: string;
}) {
  const label = kind === "hub" ? "Visor" : clientName;
  const tone = kind === "hub" ? HUB_BADGE_CLASS : clientBadgeClass("assignee-client");
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      {label}
    </Badge>
  );
}

export function KindBadge({ kind, className }: { kind: ClientKind; className?: string }) {
  return (
    <Badge variant="outline" className={cn(kind === "hub" ? HUB_BADGE_CLASS : "", className)}>
      {kind === "hub" ? "Hub Visor" : "Cliente"}
    </Badge>
  );
}
