# 0010. Host on Azure free tiers, hard-capped at $0

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

This is a portfolio project. It must stay online for reviewers indefinitely, **cost nothing**, and
never turn into a bill because of traffic, a forgotten setting or a mistake. It still has to show
production practice: infrastructure as code, keyless deployment, least privilege, monitoring and
documented failure modes.

## Decision

Everything is in [infra/](../../infra) as Bicep and is deployed by GitHub Actions with OIDC:

| Service              | SKU / plan                           | Why this one                                                      |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| API                  | App Service **F1** (Linux, .NET 10)  | Free forever; runs the same ASP.NET Core app as paid tiers        |
| Database             | Azure SQL Database **free offer**    | Serverless, auto-pauses, and pauses instead of billing (ADR 0003) |
| Web app, Storybook   | Static Web Apps **Free** ×2          | Global CDN, HTTPS, custom headers (CSP) at no cost                |
| Telemetry            | Application Insights + Log Analytics | 0.1 GB/day caps keep it inside the 5 GB/month free allowance      |
| Identity for the API | User-assigned managed identity       | Password-free SQL access; free                                    |
| Cost tripwire        | Consumption budget, $1               | Emails at the first cent; free                                    |

Security choices that cost nothing:

- **No stored credentials.** GitHub signs in with OIDC to a federated credential scoped to the
  `production` environment, which only `main` may use, with Contributor on one resource group.
  Static Web Apps tokens are fetched at deploy time. App Service basic-auth and FTP publishing are
  off.
- **No database passwords.** Azure SQL uses Entra ID only. The API uses its managed identity with
  `db_datareader`/`db_datawriter`. Schema changes run in the pipeline as the SQL admins group.
- **Narrow network access.** The SQL firewall allows the API's outbound addresses and, during a
  migration only, the deploy runner. It does not use "Allow Azure services".

## Consequences: what free costs us

| Limit                                    | Effect                                                    | Mitigation                                                               |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| F1 has no always-on                      | The API sleeps when idle; the first request takes seconds | Client retries; deploy smoke test waits; runbook explains                |
| SQL auto-pauses after 60 min             | First query after a pause waits up to about a minute      | `EnableRetryOnFailure`, `Connect Timeout=60`, 5xx retries in the web app |
| SQL free allowance (100k vCore-s/month)  | A chatty probe could exhaust it in days                   | `/health` never touches the DB; only `/health/ready` does, on deploy     |
| F1: 60 CPU min/day                       | Heavy load stops the app until tomorrow                   | It's a demo; the perf case study is measured locally (docs/perf)         |
| No deployment slots on F1                | No zero-downtime swap; rollback is a redeploy             | Re-run an earlier successful Deploy run (runbook)                        |
| No VNet/private endpoints on these tiers | The database has a public endpoint                        | Entra-only auth plus an IP-restricted firewall                           |
| Unsigned desktop installer               | SmartScreen warning                                       | Checksums plus a build-provenance attestation (ADR 0009)                 |
| Telemetry capped                         | Data may stop late in a busy day                          | 25% sampling; health probes not traced                                   |

Moving to paid tiers changes SKUs in Bicep, not the architecture. B1 plus always-on and deployment
slots would remove the first, fourth and fifth rows.

## Alternatives considered

- **Azure Container Apps (consumption).** Its free grant is generous, but it isn't a hard cap.
  Scale-out under load would bill.
- **Azure Functions (consumption).** Same billing concern, and the API is a regular ASP.NET Core app.
- **Cosmos DB free tier.** Rejected for data-model reasons in ADR 0003.
- **Other clouds or free PaaS.** The target role is Azure-centric, and showing Entra ID, managed
  identity and Azure SQL is part of the point.
