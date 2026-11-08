# Contributing

Thanks for helping. This guide gets you from a fresh clone to a green build in under 10 minutes,
then explains how we work: branches, commits, pull requests, and the standards CI enforces.

## 1. Set up (about 10 minutes)

### Prerequisites

| Tool                                   | Version                        | Check              |
| -------------------------------------- | ------------------------------ | ------------------ |
| Git                                    | any recent                     | `git --version`    |
| .NET SDK                               | 10.0 (pinned in `global.json`) | `dotnet --version` |
| Node.js                                | 24 LTS (pinned in `.nvmrc`)    | `node --version`   |
| pnpm (via Corepack, bundled with Node) | pinned in `package.json`       | `pnpm --version`   |

> **Windows:** if Node is installed under `C:\Program Files`, run `corepack enable` once from an
> elevated terminal. Installs fail on Node versions older than 22.13 (`engineStrict`).

### Commands

```sh
git clone <repo-url> race-shop-parts-tracker
cd race-shop-parts-tracker

corepack enable          # makes the pinned pnpm version available
pnpm install             # installs JS tooling and enables the commit-msg git hook

dotnet build api/RaceShop.slnx
dotnet test --solution api/RaceShop.slnx
pnpm lint && pnpm test
```

If all four commands pass, you are set up.

## 2. Repository layout

```text
api/                 .NET 10 solution (layered, see docs/adr/0001)
  src/               Domain, Application, Infrastructure, Api
  tests/             xUnit tests
apps/                runnable front ends (web, desktop, storybook)
packages/            shared TypeScript packages (ui, api-client)
docs/adr/            architecture decision records
scripts/             repo tooling (no dependencies)
.github/             CI workflows, PR and issue templates, CODEOWNERS
```

## 3. Everyday commands

| Task                      | Command                                     |
| ------------------------- | ------------------------------------------- |
| Build the API             | `dotnet build api/RaceShop.slnx`            |
| Test the API              | `dotnet test --solution api/RaceShop.slnx`  |
| Fix C# formatting         | `dotnet format api/RaceShop.slnx`           |
| Lint TypeScript           | `pnpm lint` (`pnpm lint:fix` to autofix)    |
| Format everything else    | `pnpm format`                               |
| Type-check / test / build | `pnpm typecheck`, `pnpm test`, `pnpm build` |

## 4. Quality gates

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every pull request. Before you
push, run the same checks locally:

- **C#:** nullable reference types are on. The recommended .NET analyzers and the code-style rules
  in [.editorconfig](.editorconfig) run during the build, and **every warning is an error**.
  `dotnet format --verify-no-changes` must pass.
- **TypeScript:** `strict` plus extra checks ([tsconfig.base.json](tsconfig.base.json)), type-aware
  `typescript-eslint` strict rules, and `--max-warnings 0`. Prettier owns formatting; don't
  hand-format.
- **Tests:** all tests pass. New behavior comes with tests; bug fixes come with a test that
  failed before the fix.
- **Dependencies:** lock files are committed and CI restores in locked mode. NuGet audit fails the
  build on a known-vulnerable package. pnpm won't install a release younger than 3 days.

Don't silence a rule to get green. If a rule is wrong for a case, suppress it as narrowly as you
can (one line), say why in a comment, and expect the reviewer to ask about it.

## 5. Branches and commits

- Branch from `main`: `feat/part-search`, `fix/install-overlap`, `docs/runbook`, `chore/...`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). The
  `commit-msg` hook checks each commit locally and CI checks every commit in the PR.

```text
type(scope): subject in imperative mood, lowercase, no period, max 72 chars

Optional body: why the change was needed, not what the diff already shows.
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `style`,
`revert`. Common scopes: `api`, `domain`, `ui`, `web`, `desktop`, `infra`. Add `!` after the
type/scope for a breaking change.

- Keep commits small, each one doing a single thing. `git commit --fixup` is fine while you
  work, but squash those commits before merge (CI rejects `fixup!` commits).
- The changelog is generated from these messages, so the subject is what users will read.

## 6. Pull requests

- Keep each PR to one concern and small enough to review in about 20 minutes (roughly under 400
  changed lines, not counting generated code).
- Fill in the [PR template](.github/pull_request_template.md): what, why, how to test, and the
  risks.
- [CODEOWNERS](.github/CODEOWNERS) requests reviewers automatically. A PR needs green CI and one
  approval.
- Reply to every review comment, either with a change or a reason. Comments marked `nit:` are
  optional.

## 7. Architecture decisions

A decision that is expensive to reverse (a new layer, datastore, framework, hosting change) gets
an ADR in [docs/adr/](docs/adr/) using the [template](docs/adr/template.md), in the same PR as the
change. An accepted ADR is never edited; a new ADR supersedes it.

## 8. Adding a dependency

Every package is a long-term cost. In the PR description, say what it does, why the platform or an
existing package can't do it, and what its maintenance and license status are. .NET versions go in
[api/Directory.Packages.props](api/Directory.Packages.props) (central package management).
