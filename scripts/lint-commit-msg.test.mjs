// @ts-check
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lintMessage } from './lint-commit-msg.mjs';

describe('lintMessage', () => {
  it('accepts a header with type, scope and subject', () => {
    assert.deepEqual(lintMessage('feat(api): add part search'), []);
  });

  it('accepts a breaking-change marker and a body after a blank line', () => {
    assert.deepEqual(lintMessage('refactor!: rename install record\n\nBody text.'), []);
  });

  it('ignores git comment lines', () => {
    assert.deepEqual(lintMessage('# Please enter a message\nfix: handle null cost'), []);
  });

  it('accepts git-generated merge and revert headers', () => {
    assert.deepEqual(lintMessage("Merge branch 'main' into feat/x"), []);
    assert.deepEqual(lintMessage('Revert "feat: add x"'), []);
  });

  it('rejects a header without a type', () => {
    assert.equal(lintMessage('added part search').length, 1);
  });

  it('rejects an unknown type', () => {
    assert.match(lintMessage('feature: add x').join(), /Unknown type "feature"/);
  });

  it('rejects an uppercase subject and a trailing period', () => {
    const errors = lintMessage('fix: Fixed the bug.');
    assert.equal(errors.length, 2);
  });

  it('rejects a header longer than 72 characters', () => {
    assert.match(lintMessage(`docs: ${'x'.repeat(70)}`).join(), /keep it within 72/);
  });

  it('rejects a body with no blank line after the header', () => {
    assert.match(lintMessage('fix: a\nbody').join(), /blank line/);
  });

  it('allows fixup commits locally but rejects them in CI', () => {
    assert.deepEqual(lintMessage('fixup! feat: add x', { allowAutosquash: true }), []);
    assert.equal(lintMessage('fixup! feat: add x').length, 1);
  });
});
