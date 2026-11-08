import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

const electronPath = createRequire(import.meta.url)('electron') as string;
const appDir = join(import.meta.dirname, '..');

async function launch(userDataDir: string, apiBaseUrl = 'http://localhost:5080') {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RACESHOP_USER_DATA_DIR: userDataDir,
    RACESHOP_API_BASE_URL: apiBaseUrl,
  };
  delete env.ELECTRON_RUN_AS_NODE; // set by some tools; makes Electron run as plain Node
  // GitHub's Ubuntu runners block Chromium's setuid sandbox; the renderer's Electron sandbox stays on.
  const args = process.platform === 'linux' && process.env.CI ? ['--no-sandbox', appDir] : [appDir];
  const definedEnv = Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  const app = await electron.launch({ executablePath: electronPath, args, env: definedEnv });
  const window = await app.firstWindow();
  return { app, window };
}

async function signIn(window: Page, role: 'PartsManager' | 'CrewChief') {
  await window.getByLabel('Name').fill('desktop-tester');
  await window.getByLabel('Role').selectOption(role);
  await window.getByRole('button', { name: 'Sign in' }).click();
  await expect(window.getByRole('heading', { level: 1, name: 'Parts' })).toBeVisible();
}

async function openRotor(window: Page) {
  await window.getByRole('searchbox', { name: 'Search parts' }).fill('rotor');
  await window.getByRole('button', { name: 'Search' }).click();
  await window.getByRole('link', { name: 'BR-380-F' }).click();
  await window.getByRole('link', { name: 'BR380-0002' }).click();
  await expect(window.getByRole('heading', { level: 1, name: 'BR380-0002' })).toBeVisible();
}

let running: ElectronApplication | undefined;
test.afterEach(async () => {
  await running?.close();
  running = undefined;
});

test('runs the shared screens, with API calls proxied by the main process', async () => {
  const { app, window } = await launch(mkdtempSync(join(tmpdir(), 'raceshop-e2e-')));
  running = app;

  await signIn(window, 'PartsManager');
  await openRotor(window);

  await expect(window.getByRole('meter', { name: 'Life used, BR380-0002' })).toHaveAttribute(
    'aria-valuetext',
    /Near limit/,
  );
  await expect(window.getByRole('button', { name: 'Install on a car' })).toBeEnabled();
  // The renderer is an ordinary sandboxed page: no Node.js, only the narrow bridge.
  expect(await window.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe(
    'undefined',
  );
  expect(
    await window.evaluate(() =>
      Object.keys((globalThis as unknown as { raceshop: object }).raceshop).sort(),
    ),
  ).toEqual(['auth', 'authMode', 'offlineCache']);

  // Legacy mode: axe normally opens a helper page per frame, which Electron does not support.
  const axe = await new AxeBuilder({ page: window })
    .setLegacyMode()
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);
});

test('goes read-only when the connection drops, and recovers on reconnect', async () => {
  const { app, window } = await launch(mkdtempSync(join(tmpdir(), 'raceshop-e2e-')));
  running = app;
  await signIn(window, 'PartsManager');
  await openRotor(window);

  await window.context().setOffline(true);

  await expect(window.getByRole('alert').filter({ hasText: "You're offline" })).toBeVisible();
  await expect(window.getByRole('button', { name: 'Install on a car' })).toBeDisabled();
  // Data already viewed is still there.
  await window.getByRole('link', { name: 'BR-380-F' }).click();
  await expect(window.getByRole('heading', { level: 1, name: 'BR-380-F' })).toBeVisible();

  await window.context().setOffline(false);
  await expect(window.getByText("You're offline")).toHaveCount(0);
});

test('keeps viewed parts on the device across restarts, encrypted (Windows DPAPI)', async () => {
  test.skip(
    process.platform !== 'win32',
    'OS encryption (safeStorage) is only guaranteed on Windows',
  );
  const userData = mkdtempSync(join(tmpdir(), 'raceshop-e2e-'));

  const first = await launch(userData);
  await signIn(first.window, 'CrewChief');
  await openRotor(first.window);
  const partUrl = first.window.url();
  await first.window.waitForTimeout(1500); // the cache is saved at most once a second
  await first.app.close();

  // Second start: the API is unreachable and the network is down.
  const second = await launch(userData, 'http://127.0.0.1:9');
  running = second.app;
  await second.window.context().setOffline(true);
  await signIn(second.window, 'CrewChief');
  await second.window.goto(partUrl);

  await expect(second.window.getByRole('heading', { level: 1, name: 'BR380-0002' })).toBeVisible();
  await expect(second.window.getByText('last synced')).toBeVisible();
});
