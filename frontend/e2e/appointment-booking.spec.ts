import { test, expect, request, Page } from "@playwright/test";
import { format, addDays, isWeekend } from "date-fns";

import {
  loginAsAdmin,
  unique,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from "./fixtures";

const API_URL =
  process.env.E2E_API_URL ?? "http://localhost:8000";


function getNextWeekday() {
  let date = addDays(new Date(), 1);

  while (isWeekend(date)) {
    date = addDays(date, 1);
  }

  return format(date, "yyyy-MM-dd");
}


const targetDate = getNextWeekday();


/**
 * Creates a patient directly through the API.
 *
 * This keeps appointment tests independent from
 * the patient-management E2E tests.
 */
async function createPatientViaApi(name: string) {
  const ctx = await request.newContext({
    baseURL: API_URL,
  });

  try {
    const loginRes = await ctx.post("/api/auth/login", {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    expect(loginRes.ok()).toBeTruthy();

    const { access_token } = await loginRes.json();

    expect(access_token).toBeTruthy();

    const patientRes = await ctx.post("/api/patients", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      data: {
        full_name: name,
        condition_type: "speech",
      },
    });

    expect(patientRes.ok()).toBeTruthy();
  } finally {
    await ctx.dispose();
  }
}


/**
 * Searches for appointment slots and waits until
 * the UI reaches one of its final states:
 *
 * 1. At least one available slot is displayed
 * OR
 * 2. "No open slots found" is displayed
 */
async function searchForSlots(
  page: Page,
  options: {
    patientName?: string;
    duration: string;
  }
) {
  if (options.patientName) {
    await page
      .getByLabel("Patient")
      .selectOption({ label: options.patientName });
  }

  await page
    .getByLabel("Date")
    .fill(targetDate);

  await page
    .getByLabel("Duration")
    .selectOption(options.duration);

  await page
    .getByRole("button", {
      name: "Find available slots",
    })
    .click();

  const firstSlot = page
    .getByTestId("available-slot")
    .first();

  const noSlots = page.getByText(
    "No open slots found",
    {
      exact: true,
    }
  );

  /**
   * Wait for the actual search result.
   *
   * We intentionally do not wait for the
   * "Available slots on..." heading because it
   * appears immediately after clicking search,
   * before the API request may have completed.
   */
  await expect(
    firstSlot.or(noSlots)
  ).toBeVisible({
    timeout: 20_000,
  });

  return {
    firstSlot,
    noSlots,
  };
}


test.describe("Appointment scheduling", () => {
  /**
   * These tests modify shared backend data.
   *
   * Serial execution prevents them from running
   * simultaneously against the same database.
   */
  test.describe.configure({
    mode: "serial",
  });

  /**
   * Use different patients so one test's appointment
   * does not violate the "one appointment per patient
   * per day" rule in another test.
   */
  const bookingPatientName = unique("BookingPatient");

  const searchPatientName = unique("SearchPatient");


  test.beforeAll(async () => {
    await createPatientViaApi(bookingPatientName);

    await createPatientViaApi(searchPatientName);
  });


  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });


  /**
   * TEST 1
   *
   * Complete booking flow:
   *
   * Patient
   * → search slots
   * → select slot
   * → confirm booking
   * → calendar
   */
  test(
    "books an available slot end to end",
    async ({ page }) => {
      await page.goto("/appointments/new");

      const {
        firstSlot,
        noSlots,
      } = await searchForSlots(page, {
        patientName: bookingPatientName,
        duration: "45",
      });


      if (await noSlots.isVisible()) {
        throw new Error(
          `No available slots were returned for ${targetDate}`
        );
      }


      await expect(firstSlot).toBeVisible({
        timeout: 10_000,
      });

      await firstSlot.click();


      const confirmButton =
        page.getByTestId("confirm-booking");


      await expect(confirmButton).toBeVisible({
        timeout: 10_000,
      });


      await confirmButton.click();


      await expect(page).toHaveURL(
        /\/calendar/,
        {
          timeout: 15_000,
        }
      );
    }
  );


  /**
   * TEST 2
   *
   * Books an appointment using a DIFFERENT patient,
   * then searches again.
   *
   * This verifies that booking does not leave the
   * appointment search UI in a broken state.
   */
  test(
    "can search again after booking without crashing",
    async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto("/appointments/new");


      const {
        firstSlot,
        noSlots,
      } = await searchForSlots(page, {
        patientName: searchPatientName,
        duration: "30",
      });


      if (await noSlots.isVisible()) {
        throw new Error(
          `No available slots were returned for ${targetDate}`
        );
      }


      await expect(firstSlot).toBeVisible({
        timeout: 10_000,
      });


      await firstSlot.click();


      const confirmButton =
        page.getByTestId("confirm-booking");


      await expect(confirmButton).toBeVisible({
        timeout: 10_000,
      });


      await confirmButton.click();


      /**
       * This booking should succeed because this test
       * uses searchPatientName, not bookingPatientName.
       */
      await expect(page).toHaveURL(
        /\/calendar/,
        {
          timeout: 15_000,
        }
      );


      /**
       * Go back to the new appointment page
       * and search again.
       */
      await page.goto("/appointments/new");


      const result =
        await searchForSlots(page, {
          patientName: searchPatientName,
          duration: "30",
        });


      /**
       * The application must reach a valid final state:
       *
       * available slots
       * OR
       * explicit empty state.
       */
      await expect(
        result.firstSlot.or(result.noSlots)
      ).toBeVisible({
        timeout: 20_000,
      });
    }
  );


  /**
   * TEST 3
   *
   * Searches for a long-duration appointment.
   *
   * Depending on current availability, either slots
   * or the explicit empty state are valid.
   */
  test(
    "shows an empty state or available slots without crashing",
    async ({ page }) => {
      await page.goto("/appointments/new");


      const {
        firstSlot,
        noSlots,
      } = await searchForSlots(page, {
        patientName: bookingPatientName,
        duration: "90",
      });


      await expect(
        firstSlot.or(noSlots)
      ).toBeVisible({
        timeout: 20_000,
      });
    }
  );


  /**
   * TEST 4
   *
   * A slot can be selected without a patient,
   * but booking must be rejected until a patient
   * is selected.
   */
  test(
    "requires a patient before allowing booking",
    async ({ page }) => {
      await page.goto("/appointments/new");


      const {
        firstSlot,
        noSlots,
      } = await searchForSlots(page, {
        duration: "45",
      });


      if (await noSlots.isVisible()) {
        throw new Error(
          `No available slots were returned for ${targetDate}`
        );
      }


      await expect(firstSlot).toBeVisible({
        timeout: 10_000,
      });


      await firstSlot.click();


      const confirmButton =
        page.getByTestId("confirm-booking");


      await expect(confirmButton).toBeVisible({
        timeout: 10_000,
      });


      await confirmButton.click();


      await expect(
        page.getByText(
          "Please select a patient.",
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 10_000,
      });
    }
  );
});