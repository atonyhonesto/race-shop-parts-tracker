// @ts-check
/**
 * Every component exported by packages/ui must appear in a story.
 * Fails CI when a new component ships without one.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const index = readFileSync(new URL('../../packages/ui/src/index.ts', import.meta.url), 'utf8');
const components = [...index.matchAll(/^export \{ ([^}]+) \} from/gm)]
  .flatMap((match) => (match[1] ?? '').split(',').map((name) => name.trim()))
  .filter((name) => /^[A-Z]/.test(name));

const storiesDir = new URL('./stories/', import.meta.url);
const stories = readdirSync(storiesDir)
  .filter((file) => file.endsWith('.stories.tsx'))
  .map((file) => readFileSync(new URL(file, storiesDir), 'utf8'))
  .join('\n');

test('every exported ui component has a story', () => {
  assert.ok(components.length > 0, 'found no component exports in packages/ui/src/index.ts');
  const missing = components.filter(
    (name) => !new RegExp(`<${name}[\\s/>]|component: ${name}\\b`).test(stories),
  );
  assert.deepEqual(missing, [], `Add stories for: ${missing.join(', ')}`);
});
