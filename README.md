# Race Shop Parts Tracker

Parts and inventory tracking for a race team: part numbers, serialized parts, life limits in miles
or hours, and which car each part is installed on.

The features are deliberately small. This repository is mainly about engineering practice:
coding standards, layered design, reviews, performance tuning, security remediation, production
support, and one set of screens reused on web and desktop.

> **Status:** phase 5 of 7: Bicep infrastructure on Azure free tiers, OIDC deployment, no stored credentials.

| Phase | Scope                                                       | State       |
| ----- | ----------------------------------------------------------- | ----------- |
| 1     | Monorepo scaffold, quality gates, CI, contributing guide    | In review   |
| 2     | Domain, API, EF Core migrations, unit and integration tests | In review   |
| 3     | Shared UI and API-client packages, web app, Storybook       | In review   |
| 4     | Electron app with offline parts list, release workflow      | In review   |
| 5     | Bicep infrastructure, OIDC deploy to Azure free tiers       | In review   |
| 6     | Performance case study, CodeQL and Dependabot, remediation  | Not started |
| 7     | Review guide, runbook, full README                          | Not started |

- **Get started:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Design decisions:** [docs/adr/](docs/adr/)
- **Deploying to Azure:** [docs/deploy/azure-setup.md](docs/deploy/azure-setup.md)
