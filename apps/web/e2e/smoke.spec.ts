import { expect, test } from '@playwright/test';

import { expectNoA11yViolations, signIn } from './helpers';

/*
 * Smoke test over the sample data the API seeds in Development (DevelopmentData.cs).
 * Each test leaves the data as it found it, so the suite can be re-run against the same database.
 */

test('crew chief finds a part, sees its life status, and cannot change it', async ({ page }) => {
  await signIn(page, 'casey', 'CrewChief');
  await expectNoA11yViolations(page);

  await page.getByRole('searchbox', { name: 'Search parts' }).fill('rotor');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'BR-380-F' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'BR-380-F' })).toBeVisible();
  await expect(page).toHaveTitle(/BR-380-F/);
  await expect(page.getByRole('meter', { name: 'Life used, BR380-0002' })).toHaveAttribute(
    'aria-valuetext',
    /Near limit/,
  );
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: 'BR380-0003' }).click();
  await expect(page.getByRole('meter', { name: 'Life used, BR380-0003' })).toHaveAttribute(
    'aria-valuetext',
    /Expired/,
  );
  await expect(page.getByRole('button', { name: 'Install on a car' })).toHaveCount(0);
  await expect(
    page.getByText('Only parts managers can install, remove or retire parts.'),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test('parts manager installs a part on a car and removes it again', async ({ page }) => {
  await signIn(page, 'alex', 'PartsManager');
  await page.getByRole('searchbox', { name: 'Search parts' }).fill('pad');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'BR-PAD-F' }).click();
  await page.getByRole('link', { name: 'PAD-1001' }).click();

  const install = page.getByRole('button', { name: 'Install on a car' });
  await install.click();
  const dialog = page.getByRole('dialog', { name: 'Install PAD-1001' });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page);
  await dialog.getByLabel('Car').selectOption({ label: '#07 (Red Line Racing)' });
  await dialog.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Installed' })).toBeVisible();
  await expect(page.getByText('#07 since')).toBeVisible();

  await page.getByRole('button', { name: 'Remove from car' }).click();
  const removeDialog = page.getByRole('dialog', { name: 'Remove PAD-1001' });
  await removeDialog.getByLabel('Miles since install').fill('0');
  await removeDialog.getByRole('button', { name: 'Remove' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Removed from car' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install on a car' })).toBeVisible();
});

test('keyboard: skip link reaches main content and Esc closes a dialog back to its button', async ({
  page,
}) => {
  await signIn(page, 'alex', 'PartsManager');
  // Start from a fresh page load, so Tab begins at the top of the document.
  await page.goto('/parts');
  await expect(page.getByRole('heading', { level: 1, name: 'Parts' })).toBeVisible();

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  await page.goto('/parts?search=pad');
  await page.getByRole('link', { name: 'BR-PAD-F' }).click();
  await page.getByRole('link', { name: 'PAD-1001' }).click();
  const install = page.getByRole('button', { name: 'Install on a car' });
  await install.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(install).toBeFocused();
});

test('dark theme passes the same accessibility checks', async ({ page }) => {
  await signIn(page, 'casey', 'CrewChief');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoA11yViolations(page);

  await page.goto('/parts?search=BR-380-F');
  await page.getByRole('link', { name: 'BR-380-F' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'BR-380-F' })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('works at phone width without sideways page scrolling @phone', async ({ page }) => {
  await signIn(page, 'casey', 'CrewChief');
  await page.goto('/parts?search=BR-380-F');
  await page.getByRole('link', { name: 'BR-380-F' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'BR-380-F' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoA11yViolations(page);
});
