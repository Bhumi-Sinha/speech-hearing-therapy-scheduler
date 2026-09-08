import { test, expect } from "@playwright/test";
import { loginAsAdmin, unique } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test.describe("Therapist management", () => {
  test("adds a new therapist and sees it in the list", async ({ page }) => {
    const name = unique("Dr. Test");
    await page.goto("/therapists");
    await page.getByRole("button", { name: /add therapist/i }).click();

    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Email").fill(`${name.replace(/\s+/g, ".").toLowerCase()}@clinic.com`);
    await page.getByRole("button", { name: /add therapist|save/i }).click();

    await expect(page).toHaveURL(/\/therapists$/);
    await expect(page.getByText(name)).toBeVisible();
  });
});

test.describe("Room management", () => {
  test("adds a new room and sees it in the list", async ({ page }) => {
    const name = unique("Room");
    await page.goto("/rooms");
    await page.getByRole("button", { name: /add room/i }).click();

    await page.getByLabel("Room name").fill(name);
    await page.getByRole("button", { name: /add room|save/i }).click();

    await expect(page).toHaveURL(/\/rooms$/);
    await expect(page.getByText(name)).toBeVisible();
  });

  // NOTE: the `rooms.name` column has a DB-level UNIQUE constraint, but
  // routers/rooms.py does not catch the resulting IntegrityError, so today
  // this currently surfaces as the generic "Something went wrong" fallback
  // (and a 500 in the network tab) instead of a friendly "name already
  // taken" message. This test intentionally only checks that *some* error
  // is shown and the user isn't kicked to a broken page - tighten the
  // assertion to the specific message once the backend returns a proper
  // 400/409 with a clear `detail`.
  test("blocks two rooms with the same name", async ({ page }) => {
    const name = unique("Room");
    await page.goto("/rooms/new");
    await page.getByLabel("Room name").fill(name);
    await page.getByRole("button", { name: /add room|save/i }).click();
    await expect(page).toHaveURL(/\/rooms$/);

    await page.goto("/rooms/new");
    await page.getByLabel("Room name").fill(name);
    await page.getByRole("button", { name: /add room|save/i }).click();
    await expect(page).toHaveURL(/\/rooms\/new/); // should NOT silently navigate away
    await expect(
      page.getByText(/already exists|already in use|duplicate/i)
    ).toBeVisible(); // some error feedback must render
  });
});
