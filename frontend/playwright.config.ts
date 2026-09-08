import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config.
 *
 * Assumes the full stack (db + backend + frontend) is already running,
 * e.g. via `docker compose up -d`, with:
 *   - frontend served at http://localhost:5173
 *   - backend API at      http://localhost:8000
 *   - seed data loaded (admin@clinic.com / Admin@123, 2 therapists, 3 rooms)
 *
 * Override the frontend URL with E2E_BASE_URL if needed.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share seeded DB state (patients/appointments) - keep sequential
  workers: 1,
  reporter: "html",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
