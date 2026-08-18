import { redirect } from "next/navigation";
import { getUnreadOpsAlerts, runOverdueCheck } from "@/app/actions/alerts";
import { getCurrentProfile } from "@/app/actions/auth";
import { getClients, getCustomerClients } from "@/app/actions/clients";
import { getBoardTasks, getCategories } from "@/app/actions/tasks";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { AppHeader } from "@/components/layout/app-header";
import { OpsAlertsBanner } from "@/components/layout/ops-alerts-banner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const isHub = profile.client.kind === "hub";
  if (isHub) {
    await runOverdueCheck();
  }

  const [tasks, categories, customers, clients, alerts] = await Promise.all([
    getBoardTasks(),
    getCategories(),
    getCustomerClients(),
    getClients(),
    isHub ? getUnreadOpsAlerts() : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {isHub ? "Hub Visor" : profile.client.name}
          </p>
          <h2 className="font-serif text-3xl">
            {isHub ? "Todas las peticiones" : "Tus peticiones"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isHub
              ? "Concentra el trabajo de todos los clientes. Filtra por cliente, categoría o responsable."
              : "Revisa el estado de tus peticiones, comenta y adjunta evidencias. Solo ves el trabajo de tu cuenta."}
          </p>
        </div>
        {isHub && <OpsAlertsBanner alerts={alerts} />}
        <KanbanBoard
          initialTasks={tasks}
          categories={categories}
          customers={customers}
          clients={clients}
          profile={profile}
        />
      </main>
    </div>
  );
}
