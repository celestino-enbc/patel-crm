import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ClientBadge } from "@/components/layout/org-badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { LogOut } from "lucide-react";

export function AppHeader({ profile }: { profile: Profile }) {
  const isHub = profile.client.kind === "hub";

  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground sm:h-9 sm:w-9">
            P
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
              Patel CRM
            </p>
            <h1 className="truncate text-sm font-semibold leading-tight">
              <span className="sm:hidden">{isHub ? "Hub VisorLab" : profile.client.name}</span>
              <span className="hidden sm:inline">
                {isHub ? "Hub de peticiones" : `Peticiones · ${profile.client.name}`}
              </span>
            </h1>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <ClientBadge name={profile.client.name} slug={profile.client.slug} />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
