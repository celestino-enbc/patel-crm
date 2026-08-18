import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clientBadgeClass, HUB_BADGE_CLASS } from "@/lib/constants";
import { hubMemberLabel } from "@/lib/team";
import type { AssigneeKind, ClientKind, HubMember } from "@/lib/types";
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
  const label = kind === "hub" ? "VisorLab" : clientName;
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
      {kind === "hub" ? "Hub VisorLab" : "Cliente"}
    </Badge>
  );
}

export function ResponsableBadge({
  member,
  className,
}: {
  member: HubMember | null;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
      <UserRound className="h-3 w-3" />
      {hubMemberLabel(member)}
    </Badge>
  );
}
