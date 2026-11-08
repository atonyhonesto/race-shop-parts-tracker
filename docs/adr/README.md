# Architecture Decision Records

An ADR records one decision that is expensive to reverse: the context, the choice, and what it
costs us. They are short, dated, and never rewritten. When a decision changes, a new ADR
supersedes the old one, and the old one stays here so the history stays readable.

| #                                                        | Decision                                | Status   | Date       |
| -------------------------------------------------------- | --------------------------------------- | -------- | ---------- |
| [0001](0001-layered-architecture.md)                     | Layered architecture for the API        | Accepted | 2026-11-07 |
| [0002](0002-monorepo-with-shared-packages.md)            | Monorepo with shared packages           | Accepted | 2026-11-07 |
| [0003](0003-sql-over-cosmos-db.md)                       | Azure SQL Database, not Cosmos DB       | Accepted | 2026-11-07 |
| [0004](0004-entra-id-app-roles.md)                       | Entra ID app roles for authorization    | Accepted | 2026-11-07 |
| [0005](0005-generated-api-client.md)                     | Generated TypeScript API client         | Accepted | 2026-11-07 |
| [0006](0006-tanstack-query-for-server-state.md)          | TanStack Query for server state         | Accepted | 2026-11-07 |
| [0007](0007-web-components-for-cross-framework-reuse.md) | Life gauge as a Web Component (Stencil) | Accepted | 2026-11-07 |

## Adding an ADR

1. Copy [template.md](template.md) to `NNNN-short-title.md` using the next number.
2. Open it in the same PR as the change it describes, with status `Proposed`.
3. When the PR merges, set the status to `Accepted` and add a row to the table above.
