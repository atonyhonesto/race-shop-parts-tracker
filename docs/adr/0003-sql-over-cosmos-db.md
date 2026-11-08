# 0003. Use Azure SQL Database, not Cosmos DB

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The data is relational, and its most important rule spans rows:

- A part has many serialized parts. A serialized part has many install records. Each install
  record points at a car.
- "A part can be on only one car at a time" means at most one open install record per serialized
  part. That has to hold even when two people press **Install** at the same moment.
- The main read is a filtered, sorted, paged search over 100k parts, with stock counts aggregated
  from serialized parts (see `docs/perf/`).

Hosting must stay on Azure free tiers, hard-capped at zero cost. Both candidates have one: Azure SQL Database's
free offer (serverless, 100k vCore-seconds and 32 GB a month, auto-pause) and Cosmos DB's free tier
(1000 RU/s, 25 GB).

## Decision

We will use **Azure SQL Database** (SQL Server locally, in a container) with EF Core.

The one-car rule is enforced three times, and only one of them is in application code:

1. **Domain:** `SerializedPart.InstallOn` rejects a part that is already installed.
2. **Optimistic concurrency:** a `rowversion` column means two requests that loaded the same part
   can't both save.
3. **Database:** a filtered unique index (`UX_InstallRecords_OneOpenInstallPerPart`,
   `WHERE RemovedAt IS NULL`) rejects a second open install, even from code that skips the domain.

Integration tests check 2 and 3 against a real SQL Server.

## Consequences

- **Easier:** joins, aggregates, unique and filtered indexes, foreign keys and transactions are all
  built in. EF Core migrations version the schema in Git. Query plans, index tuning and
  `SET STATISTICS IO` give the performance work real tools. Local dev and CI use the same engine.
- **Harder:** the free offer **auto-pauses** after inactivity, and the first request after a pause
  waits while the database resumes (up to about a minute). Connection retries cover it
  (`EnableRetryOnFailure`), and docs/runbook.md covers the failure mode. When the monthly free
  allowance runs out, the database pauses until the next month instead of billing, because we
  chose "auto-pause until next month".
- **Accepted on purpose:** schema changes need migrations and a deploy step. That is a cost, and
  it also makes every change reviewable.

## Alternatives considered

- **Cosmos DB (NoSQL API).** It has a free tier and scales horizontally, but our data isn't shaped
  for it. A uniqueness constraint applies only within one logical partition. "One open install
  per part" would need the part, its installs and its counts in one document or partition, with
  transactional batches for every write. Search with counts would mean denormalized aggregates
  kept up to date by hand or with the change feed. That is more code for a weaker guarantee.
- **Cosmos DB for PostgreSQL / Azure Database for PostgreSQL.** Relational and capable, but there
  is no permanent free tier that fits the hard cost cap. The PostgreSQL flexible server free
  allowance is for 12 months only.
- **SQLite file on App Service.** Free and simple, but the F1 plan's file system and single-writer
  locking make it fragile, and it would differ from the engine in CI.
