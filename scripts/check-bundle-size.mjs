// @ts-check
/**
 * Bundle-size budget, checked in CI against a production build. No dependencies: sizes are
 * measured with node:zlib gzip (level 9), the same compression Static Web Apps serves.
 *
 * Usage: node scripts/check-bundle-size.mjs [budget.json]   (default: apps/web/bundle-budget.json)
 *
 * The budget file lists rules; each rule matches built files by a regex on the file name:
 *   - "each": false (default)  the matched files' sizes are summed and compared with maxGzipKb
 *   - "each": true             every matched file must be under maxGzipKb on its own
 * "forbiddenStrings" fail the check if they appear in any built file (e.g. dev-only sign-in code).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/**
 * @typedef {{ name: string; pattern: string; maxGzipKb: number; each?: boolean }} Rule
 * @typedef {{ dist: string; rules: Rule[]; forbiddenStrings?: string[] }} Budget
 * @typedef {{ file: string; gzipBytes: number; content: string }} BuiltFile
 */

/**
 * Pure check, so it can be unit-tested without a build.
 * @param {BuiltFile[]} files
 * @param {Budget} budget
 * @returns {{ lines: string[]; failures: string[] }}
 */
export function evaluate(files, budget) {
  const lines = [];
  const failures = [];
  const kb = (/** @type {number} */ bytes) => (bytes / 1024).toFixed(1);

  for (const rule of budget.rules) {
    const regex = new RegExp(rule.pattern);
    const matched = files.filter((file) => regex.test(file.file));
    if (matched.length === 0) {
      failures.push(`${rule.name}: no files match /${rule.pattern}/ (budget out of date?)`);
      continue;
    }

    const checks = rule.each
      ? matched.map((file) => ({ label: `${rule.name} (${file.file})`, bytes: file.gzipBytes }))
      : [{ label: rule.name, bytes: matched.reduce((sum, file) => sum + file.gzipBytes, 0) }];

    for (const check of checks) {
      const ok = check.bytes <= rule.maxGzipKb * 1024;
      const line = `${ok ? '✓' : '✖'} ${check.label}: ${kb(check.bytes)} KB / ${String(rule.maxGzipKb)} KB gzip`;
      lines.push(line);
      if (!ok) failures.push(line);
    }
  }

  for (const forbidden of budget.forbiddenStrings ?? []) {
    const hit = files.find((file) => file.content.includes(forbidden));
    if (hit) failures.push(`Forbidden string "${forbidden}" found in ${hit.file}`);
  }

  return { lines, failures };
}

/** @param {string} budgetPath */
function main(budgetPath) {
  /** @type {Budget} */
  const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
  const dist = resolve(dirname(budgetPath), budget.dist);
  const files = readdirSync(dist)
    .filter((file) => /\.(js|css)$/.test(file))
    .map((file) => {
      const buffer = readFileSync(join(dist, file));
      return {
        file,
        gzipBytes: gzipSync(buffer, { level: 9 }).length,
        content: buffer.toString('utf8'),
      };
    });

  const { lines, failures } = evaluate(files, budget);
  for (const line of lines) console.error(line);
  if (failures.length > 0) {
    console.error(`\nBundle budget exceeded:\n  ${failures.join('\n  ')}`);
    console.error(
      'Shrink the change, split it into a lazy route, or raise the budget in a reviewed PR.',
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv[2] ?? 'apps/web/bundle-budget.json');
}
