# Module 04: Frontend Smoke Tests

## Overview
Page load validation tests using Playwright to ensure all frontend pages render without JavaScript errors.

## Test Files

### `tsx/e2e/smoke/public-pages.spec.ts`
```typescript
/**
 * Public Pages Smoke Tests
 * 
 * Validates all public pages load without errors.
 */

import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('landing page loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Streamer Studio/);
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
  });

  test('landing page has navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('landing page has CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /get started|sign up/i })).toBeVisible();
  });

  test('landing page has feature sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/brand|asset|generate/i);
  });

  test('404 page displays correctly', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await expect(page.locator('body')).toContainText(/not found|404/i);
  });
});
```

### `tsx/e2e/smoke/auth-pages.spec.ts`
```typescript
/**
 * Auth Pages Smoke Tests
 * 
 * Validates all authentication pages load with forms.
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Pages', () => {
  test('login page loads with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });

  test('login page has signup link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /sign up|create account/i })).toBeVisible();
  });

  test('signup page loads with form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/display name|name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|create/i })).toBeVisible();
  });

  test('signup page has login link', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('link', { name: /log in|sign in/i })).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset|send/i })).toBeVisible();
  });

  test('reset password page loads', async ({ page }) => {
    await page.goto('/reset-password?token=test');
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
```

### `tsx/e2e/smoke/dashboard-pages.spec.ts`
```typescript
/**
 * Dashboard Pages Smoke Tests
 * 
 * Validates dashboard pages redirect when unauthenticated
 * and load correctly when authenticated.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Pages - Unauthenticated', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('brand-kits redirects to login', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    await expect(page).toHaveURL(/login/);
  });

  test('quick-create redirects to login', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    await expect(page).toHaveURL(/login/);
  });

  test('generate redirects to login', async ({ page }) => {
    await page.goto('/dashboard/generate');
    await expect(page).toHaveURL(/login/);
  });

  test('assets redirects to login', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page).toHaveURL(/login/);
  });

  test('twitch redirects to login', async ({ page }) => {
    await page.goto('/dashboard/twitch');
    await expect(page).toHaveURL(/login/);
  });

  test('coach redirects to login', async ({ page }) => {
    await page.goto('/dashboard/coach');
    await expect(page).toHaveURL(/login/);
  });

  test('settings redirects to login', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Dashboard Pages - Authenticated', () => {
  test.use({ storageState: 'tsx/e2e/.auth/user.json' });

  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('brand-kits page loads', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    await expect(page.locator('body')).toContainText(/brand/i);
  });

  test('quick-create page loads', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    await expect(page.locator('body')).toContainText(/template|create/i);
  });

  test('generate page loads', async ({ page }) => {
    await page.goto('/dashboard/generate');
    await expect(page.locator('body')).toContainText(/generate|asset/i);
  });

  test('assets page loads', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page.locator('body')).toContainText(/asset/i);
  });

  test('twitch page loads', async ({ page }) => {
    await page.goto('/dashboard/twitch');
    await expect(page.locator('body')).toContainText(/twitch/i);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('body')).toContainText(/setting/i);
  });
});
```

## Playwright Configuration

```typescript
// tsx/e2e/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    // Desktop Chrome
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    // Mobile Safari (optional)
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: './apps/web',
  },
});
```

## Global Setup

```typescript
// tsx/e2e/global-setup.ts

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login and save auth state
  await page.goto(`${config.projects[0].use.baseURL}/login`);
  await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpass123');
  await page.getByRole('button', { name: /log in/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/);
  
  // Save auth state
  await page.context().storageState({ path: 'tsx/e2e/.auth/user.json' });
  
  await browser.close();
}

export default globalSetup;
```

## Timeout
- Individual test: 30 seconds
- Module total: 120 seconds

## Dependencies
- Backend API must be running
- Frontend server must be running

## Parallel Execution
All smoke test files can run in parallel across different browser contexts.
