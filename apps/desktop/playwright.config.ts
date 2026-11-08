import { defineConfig } from '@playwright/test';

/**
 * Drives the real Electron app (dev build: pnpm build:dev) against the real API in Development
 * mode, which needs a SQL Server (E2E_CONNECTION_STRING, see CONTRIBUTING.md).
 */
const connectionString = process.env.E2E_CONNECTION_STRING;
if (!connectionString) {
  throw new Error('Set E2E_CONNECTION_STRING (see CONTRIBUTING.md, "End-to-end tests").');
}

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'dotnet run --project ../../api/src/RaceShop.Api --no-launch-profile',
    url: 'http://localhost:5080/health',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: 'http://localhost:5080',
      ConnectionStrings__RaceShop: connectionString,
    },
  },
});
