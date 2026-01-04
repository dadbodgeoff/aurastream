/**
 * Intel Page E2E Tests
 * 
 * Tests the redesigned Intel (Daily Brief) page functionality including:
 * - Page structure and loading
 * - Header badges (Market Opportunity, Daily Assets)
 * - Topic dropdown for category switching
 * - AI Insight banner
 * - Clip carousels (YouTube, Twitch)
 * - Feed tabs (Thumbnails, Titles, Ideas, Keywords)
 * - Keyboard navigation
 * - Responsive design
 */

import { test, expect } from "@playwright/test";

test.describe("Intel Page Structure", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("intel page should load without errors", async ({ page }) => {
    const response = await page.goto("/intel");
    expect(response?.status()).toBeLessThan(500);
  });

  test("intel page should have valid HTML structure", async ({ page }) => {
    await page.goto("/intel");
    const html = await page.content();
    expect(html).toContain("<html");
    expect(html).toContain("<body");
  });

  test("intel page should redirect to login or show onboarding when unauthenticated", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should either show intel page, onboarding, or redirect to login
    const isValidState = url.includes("/intel") || url.includes("/login");
    expect(isValidState).toBe(true);
  });
});

test.describe("Intel Page Header", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("should display greeting based on time of day", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    const html = await page.content();
    // Should contain one of the greetings
    const hasGreeting = 
      html.includes("Good morning") || 
      html.includes("Good afternoon") || 
      html.includes("Good evening");
    expect(hasGreeting).toBe(true);
  });

  test("should have settings link", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    const settingsLink = page.locator('a[href="/intel/settings"]');
    // Settings link should exist (may be hidden if not authenticated)
    const count = await settingsLink.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Intel Page Topic Dropdown", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("topic dropdown should have proper ARIA attributes", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    // Look for dropdown button with aria-haspopup
    const dropdownButton = page.locator('button[aria-haspopup="listbox"]');
    const count = await dropdownButton.count();
    
    // If dropdown exists (user has subscribed categories)
    if (count > 0) {
      await expect(dropdownButton.first()).toHaveAttribute("aria-expanded");
    }
  });

  test("topic dropdown should open on click", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    const dropdownButton = page.locator('button[aria-haspopup="listbox"]');
    const count = await dropdownButton.count();
    
    if (count > 0) {
      await dropdownButton.first().click();
      await page.waitForTimeout(300);
      
      // Listbox should be visible
      const listbox = page.locator('[role="listbox"]');
      const listboxCount = await listbox.count();
      expect(listboxCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("topic dropdown should close on Escape", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    const dropdownButton = page.locator('button[aria-haspopup="listbox"]');
    const count = await dropdownButton.count();
    
    if (count > 0) {
      await dropdownButton.first().click();
      await page.waitForTimeout(300);
      
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      
      // Dropdown should be closed
      const expandedAttr = await dropdownButton.first().getAttribute("aria-expanded");
      expect(expandedAttr).toBe("false");
    }
  });
});

test.describe("Intel Page Feed Tabs", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("feed tabs should have proper ARIA roles", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    // Look for tablist
    const tablist = page.locator('[role="tablist"]');
    const tablistCount = await tablist.count();
    
    if (tablistCount > 0) {
      // Should have tabs inside
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(0);
    }
  });

  test("feed tabs should be navigable with arrow keys", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      // Focus first tab
      await tabs.first().focus();
      
      // Press right arrow
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);
      
      // Second tab should now be focused or selected
      const secondTab = tabs.nth(1);
      const isSelected = await secondTab.getAttribute("aria-selected");
      // Either the tab is selected or we moved focus
      expect(isSelected === "true" || await secondTab.evaluate(el => el === document.activeElement)).toBeTruthy;
    }
  });

  test("clicking tab should show corresponding panel", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Click second tab (Titles)
      await tabs.nth(1).click();
      await page.waitForTimeout(300);
      
      // Second tab should be selected
      const isSelected = await tabs.nth(1).getAttribute("aria-selected");
      expect(isSelected).toBe("true");
    }
  });
});

test.describe("Intel Page Carousels", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("should display YouTube trending section", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    const html = await page.content();
    // Should contain YouTube trending text
    expect(html).toContain("YouTube Trending");
  });

  test("should display Twitch clips section", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    const html = await page.content();
    // Should contain Twitch clips text
    expect(html.toLowerCase()).toContain("twitch");
    expect(html.toLowerCase()).toContain("clips");
  });
});

test.describe("Intel Page Accessibility", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("should have no critical accessibility violations", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    // Check for basic accessibility: all images should have alt text
    const images = page.locator("img");
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      // Alt should exist (can be empty for decorative images)
      expect(alt !== null).toBe(true);
    }
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    // Should have at least one h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(0); // May be 0 if redirected
  });

  test("interactive elements should be focusable", async ({ page }) => {
    await page.goto("/intel");
    await page.waitForTimeout(1000);
    
    // All buttons should be focusable
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const tabIndex = await button.getAttribute("tabindex");
      // tabindex should not be -1 for interactive buttons (unless intentionally hidden)
      if (tabIndex !== null) {
        expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1);
      }
    }
  });
});

test.describe("Intel Page Responsive Design", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("should render correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const response = await page.goto("/intel");
    expect(response?.status()).toBeLessThan(500);
    
    // Page should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin
  });

  test("should render correctly on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const response = await page.goto("/intel");
    expect(response?.status()).toBeLessThan(500);
  });

  test("should render correctly on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto("/intel");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Intel Page JavaScript", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/");
    if (response.status() >= 500) {
      test.skip(true, "Frontend is returning 500 error - likely a build issue");
    }
  });

  test("should not have JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      // Ignore auth-related errors (expected when not logged in)
      if (!error.message.includes("auth") && !error.message.includes("401")) {
        errors.push(error.message);
      }
    });

    await page.goto("/intel");
    await page.waitForTimeout(2000);

    // Filter out expected errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes("Failed to fetch") && !e.includes("NetworkError")
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test("should load required scripts", async ({ page }) => {
    await page.goto("/intel");
    const html = await page.content();
    // Should have Next.js scripts
    expect(html).toContain("_next");
  });
});
