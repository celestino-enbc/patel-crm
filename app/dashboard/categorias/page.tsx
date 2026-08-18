import { requireHubProfile } from "@/app/actions/auth";
import { getAllCategories } from "@/app/actions/categories";
import { CategoriesCrud } from "@/components/crud/categories-crud";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  await requireHubProfile();
  const categories = await getAllCategories();
  return <CategoriesCrud categories={categories} />;
}
