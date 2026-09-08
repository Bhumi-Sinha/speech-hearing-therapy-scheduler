import { Page, expect } from "@playwright/test";

export const ADMIN_EMAIL = "admin@clinic.com";
export const ADMIN_PASSWORD = "Admin@123";

/** Logs the seeded admin in through the real UI (not localStorage injection),
 *  so we also implicitly re-verify the login flow on every spec that uses it. */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Small helper to generate collision-free names across repeated test runs. */
export function unique(label: string) {
  return `${label} ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
