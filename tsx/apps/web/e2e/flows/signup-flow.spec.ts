/**
 * Signup Flow E2E Tests
 * Tests the complete user registration journey.
 */

import { test, expect } from "@playwright/test";

test.describe("Signup Flow", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  test("should navigate from landing to signup", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign up|get started/i }).first().click();
    await expect(page).toHaveURL(/signup/);
  });

  test("should show validation for invalid email", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill("invalid-email");
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign up|create/i }).click();
    // Should show email validation error
    await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
  });

  test("should show validation for weak password", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill("weak");
    await page.getByRole("button", { name: /sign up|create/i }).click();
    // Should show password requirements
    await expect(page.getByText(/password|characters/i)).toBeVisible();
  });

  test.skip("should complete signup successfully", async ({ page }) => {
    // TODO: Implement with test user cleanup
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign up|create/i }).click();
    // Should redirect to dashboard or verification
    await expect(page).toHaveURL(/dashboard|verify|confirm/);
  });
});
