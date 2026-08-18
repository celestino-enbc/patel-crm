import { signOut } from "@/app/actions/auth";
import { ClientBadge } from "@/components/layout/org-badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { LogOut } from "lucide-react";

export function AppHeader({ profile }: { profile: Profile }) {
  const isHub = profile.client.kind === "hub";

  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            P
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Patel CRM
            </p>
            <h1 className="text-sm font-semibold leading-tight">
              {isHub ? "Hub de peticiones · todos los clientes" : `Peticiones · ${profile.client.name}`}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
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
