// @ts-check
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluate } from './check-bundle-size.mjs';

const file = (/** @type {string} */ name, /** @type {number} */ kb, content = '') => ({
  file: name,
  gzipBytes: kb * 1024,
  content,
});

describe('evaluate', () => {
  it('passes when the summed size is within budget', () => {
    const result = evaluate([file('a.js', 10), file('b.js', 5)], {
      dist: '.',
      rules: [{ name: 'Total JS', pattern: '\\.js$', maxGzipKb: 15 }],
    });
    assert.deepEqual(result.failures, []);
  });

  it('fails when the summed size is over budget', () => {
    const result = evaluate([file('a.js', 10), file('b.js', 6)], {
      dist: '.',
      rules: [{ name: 'Total JS', pattern: '\\.js$', maxGzipKb: 15 }],
    });
    assert.equal(result.failures.length, 1);
  });

  it('checks each file on its own with "each"', () => {
    const result = evaluate([file('a.js', 10), file('b.js', 3)], {
      dist: '.',
      rules: [{ name: 'Chunk', pattern: '\\.js$', maxGzipKb: 5, each: true }],
    });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0] ?? '', /a\.js/);
  });

  it('fails a rule that matches nothing, so stale budgets get noticed', () => {
    const result = evaluate([file('a.js', 1)], {
      dist: '.',
      rules: [{ name: 'Route', pattern: '^Missing-', maxGzipKb: 5 }],
    });
    assert.match(result.failures[0] ?? '', /no files match/);
  });

  it('fails on forbidden strings', () => {
    const result = evaluate([file('a.js', 1, 'headers["X-Dev-User"]')], {
      dist: '.',
      rules: [],
      forbiddenStrings: ['X-Dev-User'],
    });
    assert.match(result.failures[0] ?? '', /Forbidden string/);
  });
});
