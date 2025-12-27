# Module 05: Frontend Flow Tests

## Overview
Complete user journey tests using Playwright that validate end-to-end functionality through the UI.

## Test Files

### `tsx/e2e/flows/auth-flow.spec.ts`
```typescript
/**
 * Authentication Flow E2E Tests
 * 
 * Complete authentication lifecycle through the UI.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete signup flow', async ({ page }) => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    
    await page.goto('/signup');
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill('SecurePass123!');
    await page.getByLabel(/display name|name/i).fill('E2E Test User');
    await page.getByRole('button', { name: /sign up|create/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpass123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await expect(page.locator('body')).toContainText(/invalid|incorrect|failed/i);
  });

  test('form validation shows errors', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await expect(page.locator('body')).toContainText(/required|email|password/i);
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /reset|send/i }).click();
    
    // Should show success message
    await expect(page.locator('body')).toContainText(/sent|check|email/i);
  });

  test('logout clears session', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpass123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    
    // Logout
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
    
    // Dashboard should redirect
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
```

### `tsx/e2e/flows/brand-kit-flow.spec.ts`
```typescript
/**
 * Brand Kit Flow E2E Tests
 * 
 * Complete brand kit management through the UI.
 */

import { test, expect } from '@playwright/test';

test.describe('Brand Kit Flow', () => {
  test.use({ storageState: 'tsx/e2e/.auth/user.json' });

  test('create new brand kit', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    
    // Click create button
    await page.getByRole('button', { name: /create|new|add/i }).click();
    
    // Fill form
    await page.getByLabel(/name/i).fill('E2E Test Brand');
    
    // Select colors (if color picker exists)
    // await page.locator('[data-testid="color-picker"]').click();
    
    // Submit
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Verify created
    await expect(page.locator('body')).toContainText('E2E Test Brand');
  });

  test('edit brand kit name', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    
    // Click on existing brand kit
    await page.getByText(/test brand/i).first().click();
    
    // Edit name
    await page.getByLabel(/name/i).clear();
    await page.getByLabel(/name/i).fill('Updated Brand Name');
    
    // Save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify updated
    await expect(page.locator('body')).toContainText('Updated Brand Name');
  });

  test('navigate to colors panel', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    await page.getByText(/test brand/i).first().click();
    
    // Navigate to colors tab
    await page.getByRole('tab', { name: /color/i }).click();
    
    // Verify colors panel loaded
    await expect(page.locator('body')).toContainText(/primary|color/i);
  });

  test('navigate to typography panel', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    await page.getByText(/test brand/i).first().click();
    
    await page.getByRole('tab', { name: /typography|font/i }).click();
    
    await expect(page.locator('body')).toContainText(/font|typography/i);
  });

  test('activate brand kit', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    
    // Find inactive brand kit and activate
    await page.getByRole('button', { name: /activate|set active/i }).first().click();
    
    // Verify activation
    await expect(page.locator('body')).toContainText(/active|activated/i);
  });

  test('delete brand kit', async ({ page }) => {
    await page.goto('/dashboard/brand-kits');
    
    // Click delete on a brand kit
    await page.getByRole('button', { name: /delete|remove/i }).first().click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes/i }).click();
    
    // Verify deleted (toast or removal from list)
    await expect(page.locator('body')).toContainText(/deleted|removed/i);
  });
});
```

### `tsx/e2e/flows/quick-create-flow.spec.ts`
```typescript
/**
 * Quick Create Flow E2E Tests
 * 
 * Complete quick create workflow through the UI.
 */

import { test, expect } from '@playwright/test';

test.describe('Quick Create Flow', () => {
  test.use({ storageState: 'tsx/e2e/.auth/user.json' });

  test('select template from grid', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    
    // Click on a template
    await page.getByText(/going live|milestone|emote/i).first().click();
    
    // Verify template selected (form appears)
    await expect(page.locator('form')).toBeVisible();
  });

  test('fill template fields', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    
    // Select template
    await page.getByText(/going live/i).first().click();
    
    // Fill fields
    await page.getByLabel(/title/i).fill('Stream Starting Soon');
    await page.getByLabel(/game/i).fill('Valorant');
    await page.getByLabel(/time/i).fill('7 PM EST');
    
    // Verify fields filled
    await expect(page.getByLabel(/title/i)).toHaveValue('Stream Starting Soon');
  });

  test('select brand kit for generation', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    
    // Select template
    await page.getByText(/going live/i).first().click();
    
    // Select brand kit from dropdown
    await page.getByRole('combobox', { name: /brand kit/i }).click();
    await page.getByRole('option').first().click();
    
    // Verify brand kit selected
    await expect(page.getByRole('combobox', { name: /brand kit/i })).not.toHaveValue('');
  });

  test('generate asset from template', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    
    // Select template
    await page.getByText(/going live/i).first().click();
    
    // Fill required fields
    await page.getByLabel(/title/i).fill('Test Stream');
    
    // Click generate
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Verify generation started (loading state or redirect)
    await expect(page.locator('body')).toContainText(/generating|processing|queued/i);
  });

  test('view generated asset', async ({ page }) => {
    await page.goto('/dashboard/quick-create');
    
    // Select template and generate
    await page.getByText(/going live/i).first().click();
    await page.getByLabel(/title/i).fill('Test Stream');
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Wait for completion (with timeout)
    await expect(page.locator('body')).toContainText(/complete|done|view/i, { timeout: 60000 });
    
    // Click view
    await page.getByRole('button', { name: /view|see/i }).click();
    
    // Verify asset displayed
    await expect(page.locator('img')).toBeVisible();
  });
});
```

### `tsx/e2e/flows/generation-flow.spec.ts`
```typescript
/**
 * Generation Flow E2E Tests
 * 
 * Complete asset generation workflow through the UI.
 */

import { test, expect } from '@playwright/test';

test.describe('Generation Flow', () => {
  test.use({ storageState: 'tsx/e2e/.auth/user.json' });

  test('create generation job', async ({ page }) => {
    await page.goto('/dashboard/generate');
    
    // Select asset type
    await page.getByRole('combobox', { name: /asset type/i }).click();
    await page.getByRole('option', { name: /thumbnail/i }).click();
    
    // Enter prompt
    await page.getByLabel(/prompt/i).fill('Epic gaming thumbnail with neon colors');
    
    // Click generate
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Verify job created
    await expect(page.locator('body')).toContainText(/queued|processing|generating/i);
  });

  test('monitor job progress', async ({ page }) => {
    await page.goto('/dashboard/generate');
    
    // Create job
    await page.getByRole('combobox', { name: /asset type/i }).click();
    await page.getByRole('option', { name: /thumbnail/i }).click();
    await page.getByLabel(/prompt/i).fill('Test thumbnail');
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Wait for progress indicator
    await expect(page.locator('[data-testid="progress"]')).toBeVisible({ timeout: 10000 });
  });

  test('view completed assets', async ({ page }) => {
    await page.goto('/dashboard/assets');
    
    // Verify assets list loads
    await expect(page.locator('body')).toContainText(/asset/i);
    
    // Click on an asset
    await page.locator('[data-testid="asset-card"]').first().click();
    
    // Verify asset details shown
    await expect(page.locator('img')).toBeVisible();
  });

  test('share asset publicly', async ({ page }) => {
    await page.goto('/dashboard/assets');
    
    // Click on an asset
    await page.locator('[data-testid="asset-card"]').first().click();
    
    // Click share button
    await page.getByRole('button', { name: /share/i }).click();
    
    // Verify share URL shown
    await expect(page.locator('body')).toContainText(/copied|share|link/i);
  });

  test('delete asset', async ({ page }) => {
    await page.goto('/dashboard/assets');
    
    // Click delete on an asset
    await page.getByRole('button', { name: /delete/i }).first().click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes/i }).click();
    
    // Verify deleted
    await expect(page.locator('body')).toContainText(/deleted|removed/i);
  });
});
```

## Fixtures

```typescript
// tsx/e2e/fixtures/auth.fixture.ts

import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'testpass123');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/dashboard/);
    
    await use(page);
  },
});
```

```typescript
// tsx/e2e/fixtures/api-mock.fixture.ts

import { test as base } from '@playwright/test';

export const test = base.extend({
  mockAPI: async ({ page }, use) => {
    // Mock API responses for faster tests
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/generate')) {
        await route.fulfill({
          status: 202,
          json: { id: 'mock-job-id', status: 'queued' },
        });
      } else {
        await route.continue();
      }
    });
    
    await use(page);
  },
});
```

## Timeout
- Individual test: 60 seconds (generation tests may take longer)
- Module total: 180 seconds

## Dependencies
- Backend API must be running
- Frontend server must be running
- Auth state must be set up (global-setup)

## Execution Order
Flow tests run sequentially due to potential data dependencies.
