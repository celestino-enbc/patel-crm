"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutGrid, List, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Tablero", icon: LayoutGrid, hubOnly: false, exact: true },
  { href: "/dashboard/peticiones", label: "Peticiones", icon: List, hubOnly: false, exact: false },
  { href: "/dashboard/clientes", label: "Clientes", icon: Building2, hubOnly: true, exact: false },
  { href: "/dashboard/categorias", label: "Categorías", icon: Tags, hubOnly: true, exact: false },
  { href: "/dashboard/equipo", label: "Equipo", icon: Users, hubOnly: true, exact: false },
] as const;

export function DashboardNav({ isHub }: { isHub: boolean }) {
  const pathname = usePathname();
  const visible = items.filter((item) => !item.hubOnly || isHub);

  return (
    <nav className="border-b bg-card/70">
      <div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-2 sm:px-6">
        {visible.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
