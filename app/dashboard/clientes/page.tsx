import { requireHubProfile } from "@/app/actions/auth";
import { getAdminCustomers } from "@/app/actions/clients";
import { ClientsCrud } from "@/components/crud/clients-crud";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  await requireHubProfile();
  const clients = await getAdminCustomers();
  return <ClientsCrud clients={clients} />;
}
