// @ts-check
/**
 * Cuts a release from Conventional Commits. No dependencies.
 *
 *   pnpm release [auto|patch|minor|major|x.y.z] [--dry-run]
 *     Writes the CHANGELOG.md section, sets the version in package.json and
 *     apps/desktop/package.json, commits "chore(release): vX.Y.Z" and creates the annotated tag.
 *     Pushing the tag (git push --follow-tags) runs .github/workflows/release.yml.
 *
 *   node scripts/release.mjs --notes vX.Y.Z
 *     Prints that version's CHANGELOG section (release.yml uses it as the GitHub Release notes).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** @typedef {{ sha: string; type: string; scope?: string; subject: string; breaking: boolean }} Commit */

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9-]+)\))?(?<bang>!)?: (?<subject>.+)$/;

/** Sections shown in the changelog, in order. Other types (docs, test, ci, chore, ...) are omitted. */
const SECTIONS = /** @type {const} */ ([
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
]);

/**
 * @param {string} sha
 * @param {string} message full commit message
 * @returns {Commit | null}
 */
export function parseCommit(sha, message) {
  const [header = '', ...body] = message.split('\n');
  const groups = HEADER.exec(header.trim())?.groups;
  if (!groups) return null;
  const breaking =
    Boolean(groups['bang']) || body.some((line) => line.startsWith('BREAKING CHANGE:'));
  return {
    sha,
    type: groups['type'] ?? '',
    ...(groups['scope'] ? { scope: groups['scope'] } : {}),
    subject: groups['subject'] ?? '',
    breaking,
  };
}

/**
 * Semantic version bump. Before 1.0.0 a breaking change bumps the minor version (SemVer 0.x rule).
 * @param {string} current
 * @param {string} bump auto | patch | minor | major | x.y.z
 * @param {Commit[]} commits
 */
export function nextVersion(current, bump, commits) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  const [major = 0, minor = 0, patch = 0] = current.split('.').map(Number);
  let kind = bump;
  if (bump === 'auto') {
    if (commits.some((commit) => commit.breaking)) kind = major === 0 ? 'minor' : 'major';
    else if (commits.some((commit) => commit.type === 'feat')) kind = 'minor';
    else kind = 'patch';
  }
  if (kind === 'major') return `${String(major + 1)}.0.0`;
  if (kind === 'minor') return `${String(major)}.${String(minor + 1)}.0`;
  if (kind === 'patch') return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
  throw new Error(`Unknown bump "${bump}". Use auto, patch, minor, major or x.y.z.`);
}

/**
 * @param {string} version
 * @param {string} date YYYY-MM-DD
 * @param {Commit[]} commits
 */
export function renderSection(version, date, commits) {
  const line = (/** @type {Commit} */ commit) =>
    `- ${commit.scope ? `**${commit.scope}:** ` : ''}${commit.subject} (${commit.sha.slice(0, 7)})`;
  const parts = [`## [${version}] - ${date}`];

  const breaking = commits.filter((commit) => commit.breaking);
  if (breaking.length > 0) parts.push(`### Breaking changes\n\n${breaking.map(line).join('\n')}`);

  for (const [type, title] of SECTIONS) {
    const matching = commits.filter((commit) => commit.type === type);
    if (matching.length > 0) parts.push(`### ${title}\n\n${matching.map(line).join('\n')}`);
  }

  if (parts.length === 1) parts.push('Maintenance only: no user-facing changes.');
  return `${parts.join('\n\n')}\n`;
}

/** Inserts a section above the newest release (or replaces the "No releases yet." placeholder). */
export function insertSection(changelog, section) {
  if (changelog.includes('No releases yet.'))
    return changelog.replace('No releases yet.\n', section);
  const index = changelog.indexOf('\n## [');
  if (index === -1) return `${changelog.trimEnd()}\n\n${section}`;
  return `${changelog.slice(0, index + 1)}${section}\n${changelog.slice(index + 1)}`;
}

/** Extracts one version's section from the changelog. */
export function sectionFor(changelog, version) {
  const start = changelog.indexOf(`## [${version}]`);
  if (start === -1) return null;
  const next = changelog.indexOf('\n## [', start + 1);
  return changelog.slice(start, next === -1 ? undefined : next).trim();
}

/** @param {string[]} args */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** @param {string} path @param {string} version */
function setVersion(path, version) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  json.version = version;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

/** @param {string[]} args */
function main(args) {
  if (args[0] === '--notes') {
    const version = (args[1] ?? '').replace(/^v/, '');
    const notes = sectionFor(readFileSync('CHANGELOG.md', 'utf8'), version);
    if (!notes) throw new Error(`CHANGELOG.md has no section for ${version}.`);
    process.stdout.write(`${notes}\n`);
    return;
  }

  const dryRun = args.includes('--dry-run');
  const bump = args.find((arg) => !arg.startsWith('--')) ?? 'auto';

  if (!dryRun) {
    if (git(['status', '--porcelain']))
      throw new Error('Commit or stash your changes before releasing.');
    if (git(['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main')
      throw new Error('Release from main.');
  }

  let previousTag = '';
  try {
    previousTag = git(['describe', '--tags', '--abbrev=0', '--match', 'v*']);
  } catch {
    // First release: use every commit.
  }
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const commits = git(['log', '--no-merges', '--format=%H%x00%B%x1e', range])
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha = '', message = ''] = entry.split('\0');
      return parseCommit(sha, message);
    })
    .filter((commit) => commit !== null);

  const current = JSON.parse(readFileSync('package.json', 'utf8')).version ?? '0.0.0';
  const version = nextVersion(current, bump, commits);
  const section = renderSection(version, new Date().toISOString().slice(0, 10), commits);

  if (dryRun) {
    process.stdout.write(
      `Would release v${version} (from ${previousTag || 'the first commit'}):\n\n${section}`,
    );
    return;
  }

  writeFileSync('CHANGELOG.md', insertSection(readFileSync('CHANGELOG.md', 'utf8'), section));
  setVersion('package.json', version);
  setVersion('apps/desktop/package.json', version);
  git(['add', 'CHANGELOG.md', 'package.json', 'apps/desktop/package.json']);
  git(['commit', '-m', `chore(release): v${version}`]);
  git(['tag', '-a', `v${version}`, '-m', section]);
  console.error(`✓ Tagged v${version}. Push with: git push origin main --follow-tags`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2));
}
