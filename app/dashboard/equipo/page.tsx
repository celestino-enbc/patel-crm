import { requireHubProfile } from "@/app/actions/auth";
import { getClients } from "@/app/actions/clients";
import { listInvitations } from "@/app/actions/invitations";
import { getDirectoryPeople } from "@/app/actions/team";
import { TeamCrud } from "@/components/crud/team-crud";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const profile = await requireHubProfile();
  const [people, clients, invitations] = await Promise.all([
    getDirectoryPeople(),
    getClients(),
    listInvitations(),
  ]);

  return (
    <TeamCrud
      people={people}
      clients={clients}
      invitations={invitations}
      currentUserId={profile.id}
    />
  );
}
