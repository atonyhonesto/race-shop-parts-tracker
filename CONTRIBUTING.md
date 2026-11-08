# Contributing

Thanks for helping. This guide gets you from a fresh clone to a green build in under 10 minutes,
then explains how we work: branches, commits, pull requests, and the standards CI enforces.

## 1. Set up (about 10 minutes)

### Prerequisites

| Tool                                      | Version                        | Check              |
| ----------------------------------------- | ------------------------------ | ------------------ |
| Git                                       | any recent                     | `git --version`    |
| .NET SDK                                  | 10.0 (pinned in `global.json`) | `dotnet --version` |
| Node.js                                   | 24 LTS (pinned in `.nvmrc`)    | `node --version`   |
| pnpm (via Corepack, bundled with Node)    | pinned in `package.json`       | `pnpm --version`   |
| Docker Desktop (or another Docker engine) | any recent; must be running    | `docker info`      |

> **Windows:** if Node is installed under `C:\Program Files`, run `corepack enable` once from an
> elevated terminal. Installs fail on Node versions older than 22.13 (`engineStrict`).

### Build and test

```sh
git clone <repo-url> race-shop-parts-tracker
cd race-shop-parts-tracker

corepack enable          # makes the pinned pnpm version available
pnpm install             # installs JS tooling and enables the commit-msg git hook
dotnet tool restore      # pinned dotnet-ef for migrations

dotnet build api/RaceShop.slnx
dotnet test --solution api/RaceShop.slnx   # database tests start SQL Server in Docker

pnpm build               # builds ui-wc and api-client first; apps type-check against them
pnpm lint && pnpm test
```

If these pass, you are set up. Without Docker, skip the database tests with
`dotnet test --solution api/RaceShop.slnx --filter-not-trait "Category=Database"`.

### Run the API locally

```sh
cp .env.example .env     # then set MSSQL_SA_PASSWORD to a password of your own
docker compose up -d sql

dotnet user-secrets set ConnectionStrings:RaceShop \
  "Server=127.0.0.1,1433;Database=RaceShop;User Id=sa;Password=<your password>;TrustServerCertificate=True" \
  --project api/src/RaceShop.Api

dotnet run --project api/src/RaceShop.Api   # http://localhost:5080, migrates and seeds sample data
```

Locally you don't need an Entra ID tenant. In Development the API uses a header-based sign-in:
`X-Dev-User` signs you in and `X-Dev-Roles` sets your app roles (`CrewChief`, `PartsManager`).
[RaceShop.Api.http](api/src/RaceShop.Api/RaceShop.Api.http) has ready-made requests. The API
refuses to start with this sign-in outside Development and Testing. To use a real tenant, see
[docs/auth/entra-setup.md](docs/auth/entra-setup.md).

> Use `127.0.0.1`, not `localhost`: compose publishes SQL Server on IPv4 only, and on Windows
> `localhost` can resolve to IPv6 first and time out.

### Run the web app

```sh
cp apps/web/.env.example apps/web/.env.local   # VITE_AUTH_MODE=dev: sign in with a role picker
pnpm --filter @raceshop/web dev                 # http://localhost:5173, proxies /api to :5080
```

Storybook: `pnpm --filter @raceshop/storybook dev` (http://localhost:6006). The life gauge in plain
HTML, without a framework: `pnpm --filter @raceshop/ui-wc demo`.

### Run the desktop app

```sh
pnpm --filter @raceshop/desktop install-electron   # once: downloads Electron (checksum-verified)
pnpm --filter @raceshop/desktop dev                # dev build (Development sign-in) + start
```

The desktop app calls the API through its main process (`http://localhost:5080` in dev builds), so
start the API first. To try the installer locally:
`pnpm --filter @raceshop/desktop build && pnpm --filter @raceshop/desktop package`. A production
build needs the Entra settings and an HTTPS API URL (see [Releases](#9-releases)).

### End-to-end tests

The Playwright smoke tests start the API (Development mode, seeded data) themselves. They need a SQL
Server and a connection string:

```sh
docker compose up -d sql
export E2E_CONNECTION_STRING="Server=127.0.0.1,1433;Database=RaceShopE2E;User Id=sa;Password=<your password>;TrustServerCertificate=True"

pnpm --filter @raceshop/web exec playwright install chromium   # once
pnpm --filter @raceshop/web e2e                                 # web app

pnpm --filter @raceshop/desktop build:dev
pnpm --filter @raceshop/desktop e2e                             # Electron app, incl. offline
```

## 2. Repository layout

```text
api/                 .NET 10 solution (layered, see docs/adr/0001)
  src/               Domain, Application, Infrastructure, Api
  tests/             xUnit unit tests; integration tests (in-memory API + SQL Server container)
apps/web             React + Vite app: MSAL sign-in, browser router, e2e/
apps/desktop         Electron app: same screens, main-process sign-in and API proxy, offline cache
apps/storybook       stories for every ui component, axe checks over every story
packages/screens     the app's pages, data hooks (TanStack Query) and routes, shared by web and desktop
packages/ui          shared React components and design tokens
packages/ui-wc       framework-agnostic web components (Stencil): <life-gauge>
packages/api-client  TypeScript client generated from openapi.json
docs/adr/            architecture decision records
scripts/             repo tooling (no dependencies)
.github/             CI workflows, PR and issue templates, CODEOWNERS
```

## 3. Everyday commands

| Task                      | Command                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Build the API             | `dotnet build api/RaceShop.slnx`                                                                    |
| Test the API              | `dotnet test --solution api/RaceShop.slnx`                                                          |
| Fix C# formatting         | `dotnet format api/RaceShop.slnx`                                                                   |
| Add a migration           | `dotnet ef migrations add <Name> --project api/src/RaceShop.Infrastructure --output-dir Migrations` |
| Start / stop local SQL    | `docker compose up -d sql` / `docker compose down`                                                  |
| Lint TypeScript           | `pnpm lint` (`pnpm lint:fix` to autofix)                                                            |
| Format everything else    | `pnpm format`                                                                                       |
| Type-check / test / build | `pnpm typecheck`, `pnpm test`, `pnpm build`                                                         |
| API contract changed      | `pnpm api:contract` (refreshes openapi.json and the generated client; commit both)                  |
| Bundle-size budget        | `pnpm build && pnpm bundle:check` (budgets in `apps/web/bundle-budget.json`)                        |
| Accessibility of stories  | `pnpm --filter @raceshop/storybook build && pnpm --filter @raceshop/storybook test:a11y`            |

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
- **Accessibility (WCAG 2.2 AA):** axe checks every Storybook story in light and dark themes and
  every page in the end-to-end smoke test. Every exported `ui` component needs a story (a test
  checks this). Use native elements (button, label, dialog, table) before ARIA.
- **API contract:** `packages/api-client/openapi.json` must match the API, and the generated
  client must match `openapi.json`. Run `pnpm api:contract` after changing an endpoint or a
  response type.
- **Bundle size:** the production web build must fit the gzip budgets in
  `apps/web/bundle-budget.json`, and must not contain the development sign-in.
- **Dependencies:** lock files are committed and CI restores in locked mode. NuGet audit fails the
  build on a known-vulnerable package. pnpm won't install a release younger than 3 days, and
  dependency install scripts are blocked unless `pnpm-workspace.yaml` allows them.

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

## 9. Releases

Releases ship the Windows installer for the desktop app. The web app and API deploy continuously
from `main`.

1. On an up-to-date `main` with a clean working tree, preview the release:
   `pnpm release --dry-run`. The version comes from the commits since the last tag: `feat` bumps the
   minor version, `fix` and `perf` bump the patch version, and a breaking change (`!` or
   `BREAKING CHANGE:`) bumps the major version (the minor version before 1.0).
2. `pnpm release` (or `pnpm release minor`, `pnpm release 1.0.0`) writes the `CHANGELOG.md` section,
   sets the version, commits `chore(release): vX.Y.Z` and tags it.
3. `git push origin main --follow-tags`. The tag runs
   [release.yml](.github/workflows/release.yml), which builds the NSIS installer, attaches
   SHA-256 checksums and a build-provenance attestation, and publishes a GitHub Release with the
   changelog section as notes.

The workflow reads the app's settings from repository **variables** (not secrets; none of them are
confidential): `DESKTOP_API_BASE_URL`, `ENTRA_TENANT_ID`, `ENTRA_DESKTOP_CLIENT_ID` and `API_SCOPE`.
See [docs/auth/entra-setup.md](docs/auth/entra-setup.md).

> The installer is not code-signed (certificates cost money; this project stays on free tiers), so
> Windows SmartScreen warns on first run. Verify a download with
> `gh attestation verify <installer>.exe --repo <owner>/<repo>` or the published `SHA256SUMS.txt`.
