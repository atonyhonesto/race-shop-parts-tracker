import { defineConfig, devices } from '@playwright/test';

/**
 * Full-stack smoke test: the real API (Development mode: migrations, sample data, Dev sign-in)
 * against SQL Server, and the built web app served by `vite preview`, which proxies /api.
 *
 * Needs a SQL Server: locally `docker compose up -d sql`; in CI a service container.
 * E2E_CONNECTION_STRING points the API at it.
 */
const connectionString = process.env.E2E_CONNECTION_STRING;
if (!connectionString) {
  throw new Error(
    'Set E2E_CONNECTION_STRING to a SQL Server connection string (see CONTRIBUTING.md, "End-to-end tests").',
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one shared database; tests change data
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
  ],
  webServer: [
    {
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
    {
      command: 'pnpm build:e2e && pnpm preview:e2e',
      url: 'http://localhost:4173',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
