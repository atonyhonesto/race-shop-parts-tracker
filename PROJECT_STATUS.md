# Project status (snapshot 2026-11-09)

## Purpose

Race Shop Parts Tracker: parts and inventory for a race team (part numbers, serialized parts, life
limits in miles/hours, which car each part is on). A portfolio project for a GM Motorsports Senior
SWE role: it proves engineering practice (standards, reviews, perf, security, ops) more than features.
Live: web https://brave-meadow-0fa64690f.6.azurestaticapps.net · Storybook
https://mango-pebble-04fb3c90f.6.azurestaticapps.net · API https://raceshop-vibeoz-api.azurewebsites.net

## Architecture

- `api/src/RaceShop.Domain`: entities and rules (one car at a time, warn 80%, block 100%); no dependencies.
- `api/src/RaceShop.Application`: use cases, ports (`IInventoryStore`, `IInventoryQueries`), query models.
- `api/src/RaceShop.Infrastructure`: EF Core DbContext, configurations, migrations, port implementations, sample data.
- `api/src/RaceShop.Api`: minimal API endpoints, Entra auth and policies, CORS, health, telemetry, ProblemDetails.
- `api/tools/RaceShop.Seed`: seeds a migrated database (profile `demo`; perf profile to come).
- `api/tests`: UnitTests (domain, use cases, layer rules) and IntegrationTests (in-memory API plus Testcontainers SQL).
- `packages/ui-wc`: Stencil `<life-gauge>` web component.
- `packages/ui`: React components and design tokens (GM-inspired blue, Overpass font).
- `packages/api-client`: TS client generated from `openapi.json` (@hey-api), built to `dist`.
- `packages/screens`: pages, TanStack Query hooks, routes, offline UI, shared by web and desktop.
- `apps/web`: Vite app with MSAL (Entra) or dev sign-in, browser router, Playwright e2e.
- `apps/desktop`: Electron; main process owns sign-in (MSAL Node), the `/api` proxy and the encrypted offline cache.
- `apps/storybook`: stories for every ui component, axe over every story.
- `infra/`: Bicep (App Service F1, Azure SQL free, 2× Static Web Apps, App Insights with caps, budget).
- `.github/workflows`: `ci.yml`, `deploy.yml` (OIDC), `release.yml` (desktop installer), `seed.yml`.
- `docs/`: ADRs 0001–0010, `auth/entra-setup.md`, `deploy/azure-setup.md`.

## Key files

- `api/src/RaceShop.Infrastructure/Persistence/EfInventoryQueries.cs`: parts search (perf baseline, untuned).
- `api/src/RaceShop.Infrastructure/Persistence/EntityConfigurations.cs`: schema and indexes (perf work adds indexes here).
- `api/tools/RaceShop.Seed/Program.cs`: seed profiles (add the perf profile here).
- `api/Directory.Packages.props`: NuGet versions and security pins.
- `api/src/RaceShop.Api/Program.cs`: service and middleware wiring.
- `packages/screens/src/pages/PartsPage.tsx`: the parts list (virtualization target).
- `packages/ui/src/tokens.css`: colours, fonts, spacing.
- `apps/web/bundle-budget.json`: gzip budgets enforced in CI.
- `.github/workflows/ci.yml`: quality gates (CodeQL and SonarQube get added here).
- `.github/workflows/deploy.yml`: Azure deploy (migrations, database grant, smoke test).
- `infra/main.bicep`: resources; `SQL_LOCATION` switch.
- `README.md`: still a stub (phase 7 rewrite).
- `CONTRIBUTING.md`: setup, commands, gates, releases, deployment.
- `docs/deploy/azure-setup.md`: one-time Azure/GitHub setup and "SQL region".

## Conventions

- Conventional Commits, enforced by hook and CI: header ≤ 72 chars, lowercase subject, no period.
- Small commits, one branch per change, PR to `main` (protected: PR + "CI passed"), merge commits.
- C#: nullable on, analyzers as errors, file-scoped namespaces, `_camelCase` fields, PascalCase static readonly.
- C# errors: `DomainException` → 409, `NotFoundException` → 404, `ConcurrencyConflictException` → 409, with a `code` in ProblemDetails.
- TS: strict (+ `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), type-aware ESLint, Prettier.
- Server state only through TanStack Query hooks in `packages/screens/src/api`; the API throws `ApiError`.
- A11y: native elements first; every ui component has a story; axe in Storybook and e2e (WCAG 2.2 AA).
- Tests: unit (xUnit, Vitest + RTL), integration (Testcontainers, tagged `Category=Database`), e2e (Playwright).
- New packages need explicit approval; the setting that delays brand-new package versions (`minimumReleaseAge`) and blocked install scripts are in `pnpm-workspace.yaml`.
- Never run `az` commands that change Azure; give them to the user.

## Build / run / test

- Setup: `corepack enable && pnpm install && dotnet tool restore && pnpm --filter @raceshop/desktop install-electron`
- API: `dotnet build api/RaceShop.slnx` · `dotnet test --solution api/RaceShop.slnx` (no Docker: add `--filter-not-trait "Category=Database"`)
- Front end: `pnpm build` (first; builds ui-wc and api-client) · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm bundle:check`
- Format: `pnpm format` · `dotnet format api/RaceShop.slnx`
- Contract change: `pnpm api:contract` (commit `openapi.json` and the generated client)
- Run locally: `docker compose up -d sql`; `dotnet run --project api/src/RaceShop.Api`; `pnpm --filter @raceshop/web dev`; `pnpm --filter @raceshop/desktop dev`
- E2E: `E2E_CONNECTION_STRING=... pnpm --filter @raceshop/web e2e` · `pnpm --filter @raceshop/desktop build:dev && pnpm --filter @raceshop/desktop e2e`
- Storybook a11y: `pnpm --filter @raceshop/storybook build && pnpm --filter @raceshop/storybook test:a11y`
- Release: `node scripts/release.mjs [--dry-run]` then `git push origin main --follow-tags`
- Seed deployed DB: Actions → Seed → Run workflow

## Completed

- Phase 1: monorepo, quality gates, CI, contributing guide, templates, ADRs 0001–0002.
- Phase 2: domain rules, secured API (Entra app roles), EF Core, unit and integration tests, ADRs 0003–0004.
- Phase 3: Stencil gauge, ui package, generated client, web app (MSAL, TanStack Query, lazy routes), Storybook with axe, bundle budget, e2e, ADRs 0005–0007.
- Phase 4: shared screens, Electron app (main-process auth and proxy, encrypted read-only offline), release workflow, changelog script, ADRs 0008–0009.
- Phase 5: Bicep, OIDC deploy, CORS, health and readiness, telemetry, ADR 0010.
- Live deploy, demo seed, v0.1.0 desktop release, web sign-in loop fix (#10), GM-inspired theme (#11).

## Remaining work

1. Perf seed profile (100k parts, 500k installs): `api/tools/RaceShop.Seed/Program.cs`.
2. BenchmarkDotNet project; EF tuning (AsNoTracking, projection, compiled and split queries) and a Dapper search to compare: new `api/benchmarks/`, `api/src/RaceShop.Infrastructure/Persistence/EfInventoryQueries.cs`.
3. Search fixes in steps (indexes, projection, keyset vs offset paging): `EntityConfigurations.cs`, `EfInventoryQueries.cs`.
4. List virtualization and React Profiler before/after: `packages/screens/src/pages/PartsPage.tsx`.
5. Perf case study with before/after tables (API, SQL plan, render, bundle): `docs/perf/parts-search.md` (missing; already referenced from code and `bundle-budget.json`).
6. CodeQL and SonarQube Cloud in CI, plus a Dependabot config: `.github/workflows/ci.yml`, `.github/dependabot.yml` (missing).
7. Security remediation log, including the Pkcs pin (CVE-2026-84008/70162) and the ILCompiler AOT advisory: `docs/security/remediation-log.md` (missing).
8. Runbook (health, logs/traces, F1 quota, SQL auto-pause and region, rollback, OIDC subject): `docs/runbook.md` (missing; referenced from `Health.cs`, `appService.bicep`, ADR 0010).
9. Review guide plus 3 annotated before/after examples: `docs/reviews/review-guide.md` (missing).
10. `good-first-issue` labels and starter issues on GitHub.
11. README rewrite (what each job bullet maps to, live links, Mermaid diagram, cost table); the current status line and phase table are stale: `README.md`.
12. Docs fixes owed from setup: bash-only warnings, a "run this first" block, Git Bash needs `MSYS_NO_PATHCONV=1`, MSYS2 UCRT64 breaks the pnpm shim: `docs/auth/entra-setup.md`, `CONTRIBUTING.md`.
13. Docs fixes owed: read the immutable OIDC subject from `gh api .../oidc/customization/sub`; check group membership with `az ad group member check`: `docs/deploy/azure-setup.md`.
14. Move SQL back to East US 2 when Microsoft approves: delete the `SQL_LOCATION` variable, redeploy, delete the `-sql-centralus` server (no code change).
15. New desktop release so the installer gets the #10/#11 changes (`node scripts/release.mjs`).
16. Entra sign-in is untested in automation (e2e uses dev sign-in); consider a test for `apps/web/src/auth/entra.tsx` (the #10 bug class).
17. The desktop restart/encryption e2e test runs on Windows only (`test.skip` on others): `apps/desktop/e2e/desktop.spec.ts:100`.
18. Local machine: update the .NET 10 SDK (runtime 10.0.13 has an advisory). Not a repo change.

## Known risks / gotchas

- TypeScript is pinned `~6.0` because typescript-eslint doesn't support 6.1+/7.
- Build order: ui-wc and api-client must build before lint/typecheck/tests of the apps (CI builds first).
- Stencil (`packages/ui-wc`): no `noEmit`, `verbatimModuleSyntax` off, and a separate `tsconfig.build.json`, or the build silently emits nothing.
- api-client compiles with `exactOptionalPropertyTypes` off (generated code); consumers use its `.d.ts`.
- `openapi.json` must match the API (contract test), and the generated client must match `openapi.json` (CI diff).
- NuGet audit is an error: the Pkcs 10.0.14 pin is in `Directory.Packages.props` and in `.github/scripts/grant-database-access.cs`.
- `/health` must never touch the DB (it would keep Azure SQL awake and use up the free allowance); only `/health/ready` does.
- The SQL server name includes the region; changing `SQL_LOCATION` creates a new server.
- The OIDC federated subject uses GitHub's immutable format `repo:owner@id/repo@id:environment:production`.
- `EndpointPolicyTests` has an allow-list of anonymous routes; a new public route must be added there deliberately.
- CORS origins must be https (http only for loopback); wildcards fail startup.
- MSAL: `getActiveAccount()` returns a new object each call; never use it as an effect dependency.
- Electron: Node's `URL` gives `app:` an opaque origin (compare protocol and host); `ELECTRON_RUN_AS_NODE` set by some shells breaks launches; Playwright can't attach to packaged builds (fuses).
- The dev sign-in must never reach a production build; `bundle:check` forbids its strings.
- Bundle budget is tight (CSS 4.0/5 KB, JS 194/220 KB); new dependencies may need a reviewed budget change.
- `main` is protected; the release push relies on admin bypass.
- Free-tier limits: F1 sleeps (cold starts) and has a CPU quota; SQL auto-pauses; regions may be restricted per subscription.
