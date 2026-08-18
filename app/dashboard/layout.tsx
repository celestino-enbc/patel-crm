import { requireProfile } from "@/app/actions/auth";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <DashboardNav isHub={profile.client.kind === "hub"} />
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">{children}</div>
    </div>
  );
}
