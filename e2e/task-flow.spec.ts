import { expect, test } from "@playwright/test";

const visorEmail = process.env.E2E_VISOR_EMAIL ?? "visor@patel.local";
const visorPassword = process.env.E2E_VISOR_PASSWORD ?? "PatelVisor123!";
const clientEmail = process.env.E2E_CLIENT_EMAIL ?? "twosides@patel.local";
const clientPassword = process.env.E2E_CLIENT_PASSWORD ?? "PatelTwoSides123!";

test.describe("flujo Visor → cliente", () => {
  test("crear, mover y ver desde el otro lado", async ({ page }) => {
    const title = `E2E ${Date.now()}`;

    await page.goto("/login");
    await page.getByLabel("Correo").fill(visorEmail);
    await page.getByLabel("Contraseña").fill(visorPassword);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/dashboard/);

    await page.getByRole("button", { name: "Nueva petición" }).click();
    await page.getByLabel("Título / petición").fill(title);
    await page.getByRole("button", { name: "Crear petición" }).click();
    await expect(page.getByText(title).first()).toBeVisible();

    const card = page.getByText(title).first();
    const reviewColumn = page.locator("section").filter({ hasText: "En revisión" });
    await card.dragTo(reviewColumn);
    await expect(reviewColumn.getByText(title)).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.getByLabel("Correo").fill(clientEmail);
    await page.getByLabel("Contraseña").fill(clientPassword);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.locator("section").filter({ hasText: "En revisión" }).getByText(title)).toBeVisible();
  });
});
