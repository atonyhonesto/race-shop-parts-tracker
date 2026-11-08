import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

interface StoryIndex {
  entries: Record<string, { id: string; title: string; name: string; type: 'story' | 'docs' }>;
}

/** WCAG 2.2 level A and AA rules (the project's target). */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const index = JSON.parse(
  readFileSync(new URL('../storybook-static/index.json', import.meta.url), 'utf8'),
) as StoryIndex;
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    for (const story of stories) {
      test(`${story.title} / ${story.name} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
        await page.locator('#storybook-root').waitFor();
        // Let web components (life-gauge) finish their first render.
        await page.waitForLoadState('networkidle');

        const results = await new AxeBuilder({ page })
          .include('#storybook-root')
          .withTags(WCAG_22_AA)
          .analyze();

        expect(
          results.violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`),
        ).toEqual([]);
      });
    }
  });
}
