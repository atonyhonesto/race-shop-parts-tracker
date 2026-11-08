# 0005. Generate the TypeScript API client from the OpenAPI contract

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The web app, and the Electron app in phase 4, call the API. Hand-written fetch calls and
hand-copied types drift away from the C# records without anyone noticing: a renamed property
compiles fine in TypeScript and fails only at runtime, in front of a user. The API already describes
itself with OpenAPI (Microsoft.AspNetCore.OpenApi), so the contract exists. The question is how the
front end consumes it, and how we keep the two in step.

## Decision

- **The contract is a committed file.** `packages/api-client/openapi.json` is the API's OpenAPI 3.1
  document. An integration test (`OpenApiContractTests`) requests `/openapi/v1.json` from the
  in-memory API and fails if it differs from the committed file. A contract change therefore always
  shows up in the PR diff, where reviewers see it.
- **The client is generated from that file** with `@hey-api/openapi-ts`. It produces types and one
  function per operation (`searchParts`, `installPart`, ...) over `fetch`, and is compiled to `dist`
  with type declarations. CI regenerates the client and fails if the output differs from what is
  committed.
- **One command updates both:** `pnpm api:contract`.
- **No framework code in the client.** TanStack Query hooks live in the app that uses them
  (`apps/web/src/api`), so the Electron main process and scripts can use the same client.
- **Contract hygiene on the API side:**
  - numbers are strict JSON numbers, so they are typed `number`, not `number | string`
  - enums are strings
  - the document carries no server URL
  - XML doc comments become schema descriptions

## Consequences

- **Easier:**
  - Changing a C# record breaks the TypeScript build in the same PR, not production.
  - Endpoints, parameters and error shapes are typed in the app with no hand-written DTOs.
  - Reviewers see contract changes as a JSON diff.
- **Harder:**
  - Generated code is committed, so diffs get noisier. It is excluded from lint and formatting, and
    the drift check keeps it honest.
  - The generator's runtime code doesn't compile under `exactOptionalPropertyTypes`. The package
    turns off that one option for itself and ships `.d.ts` files, so the apps keep the full strict
    settings.
  - `@hey-api/openapi-ts` is still 0.x, so it is pinned to an exact version and upgraded on purpose.

## Alternatives considered

- **openapi-typescript + openapi-fetch.** It is small and popular, but its peer dependency is
  TypeScript 5 only, and this repo uses TypeScript 6.
- **Kiota (Microsoft).** It suits large APIs and several languages, but its TypeScript output depends
  on several runtime packages and a request-builder style that is heavier than this API needs.
- **Orval.** It generates TanStack Query hooks directly, which would tie the client to React and to
  one state library (see ADR 0006).
- **Hand-written client.** No tooling to maintain, but nothing would catch drift, and drift is
  exactly the problem.
- **Generate the document at build time (Microsoft.Extensions.ApiDescription.Server).** It would
  need special startup handling, because the app requires a connection string and the Entra ID
  settings to start. The contract test gets the same document from the real pipeline with no extra
  package.
