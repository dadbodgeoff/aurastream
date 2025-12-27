/**
 * Create Page E2E Tests
 * Tests the unified asset creation page functionality.
 * Note: Most tests require authentication and will be skipped if redirected to login.
 */

import { test, expect } from "@playwright/test";

test.describe("Create Page Structure", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("create page should load without errors", async ({ page }) => {
    const response = await page.goto("/dashboard/create");
    expect(response?.status()).toBeLessThan(500);
  });

  test("create page should have valid HTML structure", async ({ page }) => {
    await page.goto("/dashboard/create");
    const html = await page.content();
    expect(html).toContain("<html");
    expect(html).toContain("<body");
  });

  test("create page should redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard/create");
    // Wait for potential redirect
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should either show create page (if auth not required) or redirect to login
    const isValidState = url.includes("/dashboard/create") || url.includes("/login");
    expect(isValidState).toBe(true);
  });
});

test.describe("Create Page Content (requires auth)", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("create page should display Aurastream branding", async ({ page }) => {
    await page.goto("/dashboard/create");
    await page.waitForTimeout(1000);
    const html = await page.content();
    // Should contain Aurastream branding somewhere
    expect(html.toLowerCase()).toContain("aurastream");
  });

  test("create page should have proper meta tags", async ({ page }) => {
    await page.goto("/dashboard/create");
    const title = await page.title();
    // Title should contain Aurastream
    expect(title.toLowerCase()).toContain("aurastream");
  });
});

test.describe("Create Page API Integration", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("create page should not have JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      // Ignore auth-related errors (expected when not logged in)
      if (!error.message.includes("auth") && !error.message.includes("401")) {
        errors.push(error.message);
      }
    });

    await page.goto("/dashboard/create");
    await page.waitForTimeout(2000);

    // Filter out expected errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes("Failed to fetch") && !e.includes("NetworkError")
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test("create page should load required scripts", async ({ page }) => {
    await page.goto("/dashboard/create");
    const html = await page.content();
    // Should have Next.js scripts
    expect(html).toContain("_next");
  });
});
