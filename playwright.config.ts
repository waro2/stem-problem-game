/// <reference types="node" />
/**
 * Playwright E2E configuration.
 *
 * Prerequisites (local dev):
 *   1. docker-compose up -d          — starts postgres + applies schema
 *   2. export DATABASE_URL=postgresql://stem_game:stem_game@localhost:5432/stem_game
 *   3. npx playwright install chromium   — download browser binaries once
 *   4. npm run test:e2e
 *
 * In CI the e2e job runs after build, starts a fresh postgres service container,
 * applies migrations via `prisma migrate deploy`, and runs the tests with CI=true.
 */

import { defineConfig } from '@playwright/test';

const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://stem_game:stem_game@localhost:5432/stem_game';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: [
    {
      command: 'npm run server',
      url: 'http://localhost:3001/health',
      timeout: 120_000,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DATABASE_URL,
        SUPABASE_JWT_SECRET: process.env['SUPABASE_JWT_SECRET'] ?? 'e2e-test-secret',
        ALLOWED_ORIGINS: 'http://localhost:5173',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_URL: 'http://localhost:3001',
      },
    },
  ],
});
