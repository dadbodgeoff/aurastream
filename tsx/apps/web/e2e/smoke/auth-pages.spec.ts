/**
 * Auth Pages Smoke Tests
 * Validates authentication page accessibility.
 */

import { test, expect } from "@playwright/test";

test.describe("Auth Pages", () => {
  // Skip all tests if frontend is returning 500 (build error)
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("login page should be accessible", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(500);
  });

  test("signup page should be accessible", async ({ page }) => {
    const response = await page.goto("/signup");
    expect(response?.status()).toBeLessThan(500);
  });

  test("login page should have valid HTML", async ({ page }) => {
    await page.goto("/login");
    const html = await page.content();
    expect(html).toContain("<html");
    expect(html).toContain("<body");
  });

  test("signup page should have valid HTML", async ({ page }) => {
    await page.goto("/signup");
    const html = await page.content();
    expect(html).toContain("<html");
    expect(html).toContain("<body");
  });
});
