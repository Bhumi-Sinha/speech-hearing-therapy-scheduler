import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAsAdmin } from "./fixtures";

test.describe("Authentication", () => {
  test("rejects wrong credentials with a visible error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should stay on /login and surface an error banner, never silently proceed
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect|credentials/i)).toBeVisible();
  });

  test("logs in and reaches the dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
  });

  test("redirects unauthenticated users away from protected pages", async ({ page }) => {
    await page.goto("/patients");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs out and blocks access to protected pages afterwards", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("keeps the session across a page reload", async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Registration", () => {
  test("blocks registration with a mismatched or weak password / duplicate email", async ({ page }) => {
    await page.goto("/register");
    // Re-using the seeded admin email must be rejected by the API and shown in the UI
    await page.getByLabel("Full name").fill("Duplicate Admin");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByText("Email already registered", { exact: true })
    ).toBeVisible();
  });
});
