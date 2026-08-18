import { requireProfile } from "@/app/actions/auth";
import { getCustomerClients } from "@/app/actions/clients";
import { getHubMembers } from "@/app/actions/team";
import { getBoardTasks, getCategories } from "@/app/actions/tasks";
import { TasksCrud } from "@/components/crud/tasks-crud";

export const dynamic = "force-dynamic";

export default async function PeticionesPage() {
  const profile = await requireProfile();
  const [tasks, categories, customers, hubMembers] = await Promise.all([
    getBoardTasks({ includeArchived: true }),
    getCategories(),
    getCustomerClients(),
    getHubMembers(),
  ]);

  return (
    <TasksCrud
      tasks={tasks}
      categories={categories}
      customers={customers}
      hubMembers={hubMembers}
      profile={profile}
    />
  );
}
