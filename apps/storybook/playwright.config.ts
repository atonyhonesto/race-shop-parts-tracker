import { defineConfig, devices } from '@playwright/test';

/**
 * Runs axe against every story in the built Storybook (storybook-static), so an accessibility
 * regression in any shared component fails CI, not just shows up in the add-on panel.
 */
export default defineConfig({
  testDir: './a11y',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:6007', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'vite preview --outDir storybook-static --port 6007 --strictPort',
    url: 'http://localhost:6007/index.json',
    reuseExistingServer: !process.env.CI,
  },
});
