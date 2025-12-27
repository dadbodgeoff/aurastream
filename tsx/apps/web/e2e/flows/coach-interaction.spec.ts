/**
 * Coach Interaction Flow E2E Tests
 * Tests the AI coach conversation journey.
 */

import { test, expect } from "@playwright/test";

test.describe("Coach Interaction Flow", () => {
  test.skip("should navigate to coach", async ({ page }) => {
    // TODO: Requires auth setup
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /coach|assistant/i }).click();
    await expect(page).toHaveURL(/coach/);
  });

  test.skip("should display chat interface", async ({ page }) => {
    // TODO: Requires auth setup
    await page.goto("/dashboard/coach");
    await expect(page.getByRole("textbox", { name: /message/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /send/i })).toBeVisible();
  });

  test.skip("should send message to coach", async ({ page }) => {
    // TODO: Requires auth setup
    await page.goto("/dashboard/coach");
    await page.getByRole("textbox", { name: /message/i }).fill("Hello coach!");
    await page.getByRole("button", { name: /send/i }).click();
    // Should show message in chat
    await expect(page.getByText("Hello coach!")).toBeVisible();
  });

  test.skip("should receive coach response", async ({ page }) => {
    // TODO: Requires auth setup and API mock
    await page.goto("/dashboard/coach");
    await page.getByRole("textbox", { name: /message/i }).fill("Help me with my stream");
    await page.getByRole("button", { name: /send/i }).click();
    // Should show loading then response
    await expect(page.locator("[data-testid='coach-response']")).toBeVisible({ timeout: 10000 });
  });
});
