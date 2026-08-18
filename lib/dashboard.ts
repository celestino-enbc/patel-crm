import { revalidatePath } from "next/cache";

export function refreshDashboard() {
  revalidatePath("/dashboard", "layout");
}
