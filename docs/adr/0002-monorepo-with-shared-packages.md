# 0002. Use a monorepo with shared packages

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The product has four front-end surfaces (web app, Electron desktop app, Storybook, and the API's
OpenAPI contract) that must stay in step:

- The web and desktop apps show the **same screens**. Copying components between repos means
  they drift apart.
- The TypeScript API client is **generated from the API**. A contract change and the client that
  uses it should land in one PR, so the PR can't break the build halfway.
- One set of coding standards (formatting, lint rules, commit conventions) should apply
  everywhere, with one place to change them.

## Decision

We will keep everything in one Git repository:

```text
api/                  .NET solution (its own toolchain, see ADR 0001)
packages/ui           shared React components and design tokens
packages/api-client   TypeScript client generated from the OpenAPI document
apps/web              React + Vite app
apps/desktop          Electron shell that reuses packages/ui
apps/storybook        a story for every ui component
```

- **pnpm workspaces** link the TypeScript projects. Apps depend on packages with
  `"workspace:*"`, so a change in `packages/ui` is picked up immediately with no publishing step.
  pnpm's strict `node_modules` layout also stops a project from importing a package it hasn't
  declared.
- **Standards live at the root** and apply to every project: `.editorconfig`, `eslint.config.js`,
  `.prettierrc.json`, `tsconfig.base.json` (each project's tsconfig extends it), and
  `api/Directory.Build.props` for .NET.
- **One CI workflow** has a job per toolchain (.NET, TypeScript) and a single required status
  check.
- **No Nx or Turborepo for now.** `pnpm -r` already runs scripts in dependency order. We will
  reconsider if CI on a pull request takes longer than 10 minutes.

## Consequences

- **Easier:** changes that cross the contract are atomic. Screens are written once. Contributors
  learn one set of standards, one setup guide, and one CI.
- **Harder:** contributors need both the .NET and Node toolchains. Every PR runs every job for now;
  path filters or build caching can come later if CI time grows. A broken shared package breaks
  every app at once, which we see as a feature: we find out in the PR, not after a release.

## Alternatives considered

- **Separate repos (API, UI library, web, desktop) with packages published to a registry.** Version
  drift, and cross-cutting changes need several PRs merged in a set order. That is too much
  overhead for one team.
- **Nx or Turborepo.** Task caching and affected-project detection are real wins at scale, but
  here they add a tool and a config to learn with no measurable benefit yet.
- **npm or Yarn workspaces.** Both work. pnpm was chosen for strict dependency isolation, disk
  efficiency, and supply-chain settings (`minimumReleaseAge`, blocked install scripts).
