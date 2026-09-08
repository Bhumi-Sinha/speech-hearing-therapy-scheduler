import { test, expect } from "@playwright/test";
import { loginAsAdmin, unique } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test.describe("Patient management", () => {
  test("creates, edits, and deletes a patient end to end", async ({ page }) => {
    const name = unique("Patient");
    const editedName = `${name} (Updated)`;

    // Create
    await page.goto("/patients");
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page).toHaveURL(/\/patients\/new/);

    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Age").fill("34");
    await page.getByLabel("Phone").fill("9876543210");
    await page.getByLabel("Condition").selectOption("hearing");
    await page.getByRole("button", { name: "Add patient" }).click();

    await expect(page).toHaveURL(/\/patients$/);
    await expect(page.getByText(name)).toBeVisible();

    // Edit
    await page.getByText(name).click();
    await page.getByLabel("Full name").fill(editedName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/patients$/);
    await expect(page.getByText(editedName)).toBeVisible();

    // Delete
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByText(editedName).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/patients$/);
    await expect(page.getByText(editedName)).not.toBeVisible();
  });

  test("shows a validation error when required fields are missing", async ({ page }) => {
    await page.goto("/patients/new");
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/patients\/new/);
  });

  test("rejects a malformed email address", async ({ page }) => {
    await page.goto("/patients/new");
    await page.getByLabel("Full name").fill(unique("Patient"));
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });
});
