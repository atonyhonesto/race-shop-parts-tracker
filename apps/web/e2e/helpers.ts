import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** WCAG 2.2 level A and AA rules (the project's target). */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.help} → ${violation.nodes[0]?.target.join(' ') ?? ''}`,
    ),
  ).toEqual([]);
}

export type Role = 'PartsManager' | 'CrewChief';

/** Signs in through the Development sign-in page (the e2e build uses VITE_AUTH_MODE=dev). */
export async function signIn(page: Page, name: string, role: Role): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Role').selectOption(role);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Parts' })).toBeVisible();
}
