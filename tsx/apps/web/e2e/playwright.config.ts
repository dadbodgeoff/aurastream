/**
 * Playwright E2E Test Configuration
 * Enterprise-grade configuration for frontend E2E testing.
 */

import { defineConfig, devices } from "@playwright/test";

const config = {
  baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
  apiURL: process.env.E2E_API_URL || "http://localhost:8000",
  isCI: !!process.env.CI,
};

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: config.isCI,
  retries: config.isCI ? 2 : 0,
  workers: config.isCI ? 1 : undefined,
  
  reporter: config.isCI
    ? [
        ["github"],
        ["json", { outputFile: "test-results/results.json" }],
        ["html", { outputFolder: "test-results/html", open: "never" }],
      ]
    : [
        ["list"],
        ["json", { outputFile: "test-results/results.json" }],
        ["html", { outputFolder: "test-results/html", open: "on-failure" }],
      ],

  use: {
    baseURL: config.baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    testIdAttribute: "data-testid",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  timeout: 30000,
  expect: { timeout: 5000 },
  outputDir: "test-results/artifacts",
});
