import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables - try .env.test.local first, then .env.test
dotenv.config({ path: '.env.test.local' });
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e-tests/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project - runs first to establish auth state (Google OAuth)
    // {
    //   name: 'setup',
    //   testMatch: /.*\.setup\.ts/,
    // },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  /* 
   * GlyphLog web dev server (Vite, port 5173).
   * La API (FastAPI/uvicorn) debe estar corriendo por separado (puerto 8000).
   * En CI, levantar ambos. En local, usar reuseExistingServer.
   */
  webServer: {
    command: 'pnpm --filter @glyphlog/web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    cwd: '../../',
  },
});
