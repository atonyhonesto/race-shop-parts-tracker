// @ts-check
/**
 * Conventional Commits checker with no dependencies.
 *
 * Usage:
 *   node scripts/lint-commit-msg.mjs <message-file>    git commit-msg hook (.githooks/commit-msg)
 *   node scripts/lint-commit-msg.mjs --range <a>..<b>  CI: checks every non-merge commit in a range
 *
 * Spec: https://www.conventionalcommits.org/en/v1.0.0/
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const TYPES = /** @type {const} */ ([
  'feat',
  'fix',
  'perf',
  'refactor',
  'test',
  'docs',
  'build',
  'ci',
  'chore',
  'style',
  'revert',
]);

export const MAX_HEADER_LENGTH = 72;

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9-]+)\))?(?<breaking>!)?: (?<subject>.+)$/;
const AUTOSQUASH = /^(fixup|squash|amend)! /;
const GIT_GENERATED = /^(Merge|Revert) /;

/**
 * Checks one commit message and returns a list of problems (empty means valid).
 * @param {string} rawMessage
 * @param {{ allowAutosquash?: boolean }} [options] Allow `fixup!` commits (true for local commits; false in CI).
 * @returns {string[]}
 */
export function lintMessage(rawMessage, { allowAutosquash = false } = {}) {
  const lines = rawMessage
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.trimEnd());
  const header = lines[0] ?? '';

  if (GIT_GENERATED.test(header)) return [];
  if (AUTOSQUASH.test(header)) {
    return allowAutosquash ? [] : ['fixup!/squash!/amend! commits must be squashed before merge.'];
  }

  const errors = [];
  const match = HEADER.exec(header);

  if (!match?.groups) {
    errors.push(
      `Header must look like "type(scope): subject", e.g. "feat(api): add part search". Got: "${header}"`,
    );
    return errors;
  }

  const { type = '', subject = '' } = match.groups;
  if (!(/** @type {readonly string[]} */ (TYPES).includes(type))) {
    errors.push(`Unknown type "${type}". Use one of: ${TYPES.join(', ')}.`);
  }
  if (header.length > MAX_HEADER_LENGTH) {
    errors.push(
      `Header is ${String(header.length)} characters; keep it within ${String(MAX_HEADER_LENGTH)}.`,
    );
  }
  if (/^[A-Z]/.test(subject)) {
    errors.push('Subject should start lowercase (imperative mood: "add", not "Added").');
  }
  if (subject.endsWith('.')) {
    errors.push('Subject must not end with a period.');
  }
  if (lines.length > 1 && lines[1] !== '') {
    errors.push('Leave a blank line between the header and the body.');
  }
  return errors;
}

/**
 * @param {string} range e.g. "origin/main..HEAD"
 * @returns {{ sha: string, message: string }[]}
 */
function commitsInRange(range) {
  const output = execFileSync('git', ['log', '--no-merges', '--format=%H%x00%B%x1e', range], {
    encoding: 'utf8',
  });
  return output
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha = '', message = ''] = entry.split('\0');
      return { sha, message };
    });
}

/** @param {string[]} args */
function main(args) {
  if (args[0] === '--range') {
    const range = args[1];
    if (!range) throw new Error('Usage: lint-commit-msg.mjs --range <from>..<to>');
    let failed = 0;
    for (const { sha, message } of commitsInRange(range)) {
      const errors = lintMessage(message);
      if (errors.length > 0) {
        failed++;
        console.error(`\n✖ ${sha.slice(0, 7)} ${message.split('\n')[0] ?? ''}`);
        for (const error of errors) console.error(`    ${error}`);
      }
    }
    if (failed > 0) {
      console.error(
        `\n${String(failed)} commit(s) do not follow Conventional Commits. See CONTRIBUTING.md.`,
      );
      process.exitCode = 1;
    }
    return;
  }

  const file = args[0];
  if (!file) throw new Error('Usage: lint-commit-msg.mjs <message-file>');
  const errors = lintMessage(readFileSync(file, 'utf8'), { allowAutosquash: true });
  if (errors.length > 0) {
    console.error('✖ Commit message rejected:');
    for (const error of errors) console.error(`    ${error}`);
    console.error('  See "Commit messages" in CONTRIBUTING.md.');
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2));
}
