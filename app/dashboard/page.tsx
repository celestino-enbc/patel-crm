import { requireProfile } from "@/app/actions/auth";
import { getUnreadOpsAlerts, runOverdueCheck } from "@/app/actions/alerts";
import { getCustomerClients } from "@/app/actions/clients";
import { getHubMembers } from "@/app/actions/team";
import { getBoardTasks, getCategories } from "@/app/actions/tasks";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { OpsAlertsBanner } from "@/components/layout/ops-alerts-banner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const isHub = profile.client.kind === "hub";
  if (isHub) {
    await runOverdueCheck();
  }

  const [tasks, categories, customers, hubMembers, alerts] = await Promise.all([
    getBoardTasks(),
    getCategories(),
    getCustomerClients(),
    getHubMembers(),
    isHub ? getUnreadOpsAlerts() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {isHub ? "Hub VisorLab" : profile.client.name}
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl">
          {isHub ? "Tablero de peticiones" : "Tus peticiones"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {isHub
            ? "Arrastra tarjetas para cambiar el estado. La administración de cada módulo está en las pestañas."
            : "Revisa el estado de tus peticiones, comenta y adjunta evidencias."}
        </p>
      </div>
      {isHub && <OpsAlertsBanner alerts={alerts} />}
      <KanbanBoard
        initialTasks={tasks}
        categories={categories}
        customers={customers}
        hubMembers={hubMembers}
        profile={profile}
      />
    </div>
  );
}
