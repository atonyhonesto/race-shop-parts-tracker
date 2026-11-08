// @ts-check
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { insertSection, nextVersion, parseCommit, renderSection, sectionFor } from './release.mjs';

const commit = (/** @type {string} */ message, sha = 'abcdef1234567') => {
  const parsed = parseCommit(sha, message);
  assert.ok(parsed);
  return parsed;
};

describe('parseCommit', () => {
  it('reads type, scope and subject', () => {
    assert.deepEqual(commit('feat(desktop): add offline list'), {
      sha: 'abcdef1234567',
      type: 'feat',
      scope: 'desktop',
      subject: 'add offline list',
      breaking: false,
    });
  });

  it('detects breaking changes from ! and from the footer', () => {
    assert.equal(commit('refactor!: rename install record').breaking, true);
    assert.equal(commit('feat: x\n\nBREAKING CHANGE: the API moved').breaking, true);
  });

  it('ignores non-conventional messages', () => {
    assert.equal(parseCommit('a', 'Merge branch main'), null);
  });
});

describe('nextVersion', () => {
  it('bumps minor for features and patch for fixes', () => {
    assert.equal(nextVersion('0.3.1', 'auto', [commit('feat: a')]), '0.4.0');
    assert.equal(nextVersion('0.3.1', 'auto', [commit('fix: a')]), '0.3.2');
  });

  it('treats breaking changes as minor before 1.0 and major after', () => {
    assert.equal(nextVersion('0.3.1', 'auto', [commit('feat!: a')]), '0.4.0');
    assert.equal(nextVersion('1.3.1', 'auto', [commit('feat!: a')]), '2.0.0');
  });

  it('accepts an explicit bump or version', () => {
    assert.equal(nextVersion('0.3.1', 'major', []), '1.0.0');
    assert.equal(nextVersion('0.3.1', '0.9.0', []), '0.9.0');
    assert.throws(() => nextVersion('0.3.1', 'huge', []), /Unknown bump/);
  });
});

describe('renderSection', () => {
  it('lists breaking changes, features, fixes and performance; omits chores', () => {
    const section = renderSection('0.4.0', '2026-11-08', [
      commit('feat(web): add search', '1111111aaaa'),
      commit('fix(ui): contrast', '2222222bbbb'),
      commit('docs: readme', '3333333cccc'),
      commit('perf(api): index search', '4444444dddd'),
      commit('refactor!: rename', '5555555eeee'),
    ]);
    assert.equal(
      section,
      [
        '## [0.4.0] - 2026-11-08',
        '',
        '### Breaking changes',
        '',
        '- rename (5555555)',
        '',
        '### Features',
        '',
        '- **web:** add search (1111111)',
        '',
        '### Fixes',
        '',
        '- **ui:** contrast (2222222)',
        '',
        '### Performance',
        '',
        '- **api:** index search (4444444)',
        '',
      ].join('\n'),
    );
  });

  it('says so when a release has no user-facing changes', () => {
    assert.match(renderSection('0.4.1', '2026-11-08', [commit('ci: x')]), /Maintenance only/);
  });
});

describe('changelog editing', () => {
  const intro = '# Changelog\n\nIntro.\n\n';

  it('replaces the placeholder on the first release', () => {
    assert.equal(
      insertSection(`${intro}No releases yet.\n`, '## [0.1.0] - d\n'),
      `${intro}## [0.1.0] - d\n`,
    );
  });

  it('puts the newest release first, and can read a section back', () => {
    const changelog = insertSection(`${intro}## [0.1.0] - a\n\nold\n`, '## [0.2.0] - b\n\nnew\n');
    assert.ok(changelog.indexOf('[0.2.0]') < changelog.indexOf('[0.1.0]'));
    assert.equal(sectionFor(changelog, '0.2.0'), '## [0.2.0] - b\n\nnew');
    assert.equal(sectionFor(changelog, '0.1.0'), '## [0.1.0] - a\n\nold');
    assert.equal(sectionFor(changelog, '9.9.9'), null);
  });
});
