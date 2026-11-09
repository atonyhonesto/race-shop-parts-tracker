# Changelog

All notable changes to this project are documented here. Entries are generated from
[Conventional Commits](https://www.conventionalcommits.org/) at each release, and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-09

### Features

- **infra:** add Bicep for the free-tier Azure environment (72d622c)
- **web:** configure the web app and Storybook for Static Web Apps (8b52506)
- **api:** add CORS, a readiness check and sampled telemetry (49ffdc6)
- **desktop:** add Electron app with an encrypted offline parts list (21dc35d)
- **storybook:** add stories for every ui component with axe checks (88eae86)
- **web:** add parts screens with MSAL sign-in and TanStack Query (a16d379)
- **ui:** add design tokens and shared React components (9aa970f)
- **api-client:** generate a typed fetch client from the API contract (926eff8)
- **ui-wc:** add life-gauge web component (c7aa0a7)
- **api:** publish a host-independent OpenAPI contract (7110e96)
- **api:** add part details with serialized parts and life status (ddb3f83)
- **api:** add inventory endpoints secured by Entra ID app roles (3c8a343)
- **infrastructure:** add EF Core persistence and initial migration (7c974b7)
- **application:** add install, remove and retire use cases (d4e693c)
- **domain:** add parts, cars and installs with life-limit rules (a6f8498)

### Fixes

- **ci:** grant database access with SqlClient instead of sqlcmd (df81862)
- **ci:** install sqlcmd from Microsoft's signed package feed (e4c5189)
- **infra:** allow Azure SQL in a different region than the API (de1a26a)
- **screens:** start in offline mode when opened without a connection (fa7c0ed)
- **ui:** meet text contrast on the danger button in dark mode (ed235b7)
