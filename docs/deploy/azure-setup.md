# Azure and GitHub one-time setup

Everything after this setup is automatic: each push to `main` runs
[deploy.yml](../../.github/workflows/deploy.yml), which deploys the Bicep in [infra/](../../infra) and
the apps. This page is the only manual part. **Nothing in this repository runs these commands for
you**, because they create resources and grant access in your tenant and subscription.

What you will have afterwards:

| Piece                           | What it is                                                     | Cost |
| ------------------------------- | -------------------------------------------------------------- | ---- |
| Resource group                  | Holds everything; delete it to remove everything               | $0   |
| Deploy identity (Entra app)     | GitHub signs in as it with OIDC; Contributor on the group only | $0   |
| SQL admins group (Entra)        | Deploy identity + you; Entra admin of Azure SQL                | $0   |
| GitHub `production` environment | Holds the IDs below as variables; only `main` can use it       | $0   |

## Before you start

- Azure CLI (`az login`), GitHub CLI (`gh auth login`), and the repository pushed to GitHub.
- The Entra app registrations from [docs/auth/entra-setup.md](../auth/entra-setup.md) (API, SPA,
  desktop). You need their IDs below.
- The **Azure SQL free offer** is limited to one free database per subscription. If it is already
  used, the deploy fails rather than billing.
- Pick a region that offers both the SQL free offer and App Service F1, for example `eastus2`.

```bash
SUBSCRIPTION_ID=<your-subscription-id>
LOCATION=eastus2
RESOURCE_GROUP=rg-raceshop
GITHUB_REPO=<owner>/<repo>          # e.g. atonyhonesto/race-shop-parts-tracker
ME=$(az ad signed-in-user show --query id -o tsv)

az account set --subscription "$SUBSCRIPTION_ID"
TENANT_ID=$(az account show --query tenantId -o tsv)
```

## 1. Resource group and resource providers

```bash
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

for ns in Microsoft.Web Microsoft.Sql Microsoft.Insights Microsoft.OperationalInsights \
          Microsoft.ManagedIdentity Microsoft.Consumption; do
  az provider register --namespace "$ns"
done
```

## 2. Deploy identity with OIDC (no client secret)

GitHub proves it is running a job in your repository's `production` environment; Entra ID trusts
exactly that, and nothing else. There is no secret to store or rotate.

```bash
DEPLOY_APP_ID=$(az ad app create --display-name "github-raceshop-deploy" --query appId -o tsv)
DEPLOY_SP_ID=$(az ad sp create --id "$DEPLOY_APP_ID" --query id -o tsv)

az ad app federated-credential create --id "$DEPLOY_APP_ID" --parameters "{
  \"name\": \"github-production\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_REPO}:environment:production\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

# Contributor on this resource group only. The Bicep creates no role assignments, so it needs nothing more.
az role assignment create --assignee-object-id "$DEPLOY_SP_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "$(az group show --name "$RESOURCE_GROUP" --query id -o tsv)"
```

## 3. SQL admins group

Azure SQL uses Entra ID authentication only (no SQL logins, no passwords). This group is its
administrator: the pipeline (to run migrations) and you (for support, see docs/runbook.md).

```bash
SQL_ADMIN_GROUP_NAME=raceshop-sql-admins
SQL_ADMIN_GROUP_ID=$(az ad group create --display-name "$SQL_ADMIN_GROUP_NAME" \
  --mail-nickname "$SQL_ADMIN_GROUP_NAME" --query id -o tsv)
az ad group member add --group "$SQL_ADMIN_GROUP_ID" --member-id "$DEPLOY_SP_ID"
az ad group member add --group "$SQL_ADMIN_GROUP_ID" --member-id "$ME"
```

## 4. GitHub `production` environment and its variables

Only `main` may deploy: the environment allows that branch alone, and the federated credential only
trusts jobs in this environment.

```bash
gh api --method PUT "repos/${GITHUB_REPO}/environments/production" \
  --input - <<< '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
gh api --method POST "repos/${GITHUB_REPO}/environments/production/deployment-branch-policies" \
  -f name=main -f type=branch

set_var() { gh variable set "$1" --env production --repo "$GITHUB_REPO" --body "$2"; }
set_var AZURE_CLIENT_ID           "$DEPLOY_APP_ID"
set_var AZURE_TENANT_ID           "$TENANT_ID"
set_var AZURE_SUBSCRIPTION_ID     "$SUBSCRIPTION_ID"
set_var AZURE_RESOURCE_GROUP      "$RESOURCE_GROUP"
set_var SQL_ADMIN_GROUP_NAME      "$SQL_ADMIN_GROUP_NAME"
set_var SQL_ADMIN_GROUP_OBJECT_ID "$SQL_ADMIN_GROUP_ID"
set_var ENTRA_API_CLIENT_ID       "<api-app-id from entra-setup.md>"
set_var ENTRA_SPA_CLIENT_ID       "<spa-app-id from entra-setup.md>"
set_var API_SCOPE                 "api://<api-app-id>/access_as_user"
set_var BUDGET_EMAIL              "<you@example.com>"
set_var BUDGET_START_DATE         "$(date +%Y-%m-01)"   # first of this month; never change it later
```

None of these are secrets (they are IDs, names and an email address), which is why they are
variables, not secrets: anyone reading a workflow log would see them anyway.

## 5. First deployment

Push to `main`, or run **Actions → Deploy → Run workflow**. The run summary lists the URLs. Then:

```bash
# Let the web app sign users in from its real address (the SPA registration from entra-setup.md).
WEB_URL=<web-url from the run summary>
SPA_OBJECT_ID=$(az ad app show --id "<spa-app-id>" --query id -o tsv)
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$SPA_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body "{\"spa\":{\"redirectUris\":[\"http://localhost:5173\",\"$WEB_URL\"]}}"

# Desktop installer releases call the deployed API (repository variable, see CONTRIBUTING.md, Releases).
gh variable set DESKTOP_API_BASE_URL --repo "$GITHUB_REPO" --body "<api-url from the run summary>"
```

## SQL region

Azure sometimes stops accepting new SQL servers in a region for a given subscription. The deploy
then fails with `RegionDoesNotAllowProvisioning`. Check which regions accept them:

```bash
for loc in eastus2 centralus southcentralus westus3; do
  echo "$loc: $(az rest --uri "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.Sql/locations/$loc/capabilities?api-version=2023-08-01-preview" --query status -o tsv)"
done   # "Available" accepts new servers; "Visible" is restricted
```

Then either request access (Help + support → Service and subscription limits (quotas) → SQL
Database, region access), or put only the database in an available region:

```bash
gh variable set SQL_LOCATION --env production --repo "$GITHUB_REPO" --body centralus
```

and re-run **Deploy**. The API stays in its region. Traffic between regions is billed at about
$0.02/GB; for a demo that rounds to $0, and the budget alert would email you at the first cent.

**Moving back** once the original region is approved: the region is part of the server name, so a
new server is created rather than the old one being moved.

1. `gh variable delete SQL_LOCATION --env production --repo "$GITHUB_REPO"` and re-run **Deploy**.
   It creates the server in the API's region, applies the migrations, grants the API access and
   repoints the connection string.
2. Copy any data you want to keep. For a demo, the seed data is enough; otherwise export and import
   a `.bacpac` with SqlPackage.
3. Delete the old server:
   `az sql server delete --resource-group "$RESOURCE_GROUP" --name <name ending in -sql-centralus>`.

## Removing everything

```bash
az group delete --name "$RESOURCE_GROUP"
az ad app delete --id "$DEPLOY_APP_ID"
az ad group delete --group "$SQL_ADMIN_GROUP_ID"
```

## Why each limit is safe

| Resource                | Free allowance                             | What happens at the limit                              |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------ |
| App Service F1          | 60 CPU minutes/day, 1 GB RAM, no always-on | The app stops until the next day (HTTP 403); no charge |
| Azure SQL free offer    | 100,000 vCore-seconds + 32 GB per month    | Pauses until next month ("auto-pause"); no charge      |
| Static Web Apps Free ×2 | 100 GB bandwidth/month each                | Throttled; no charge                                   |
| Application Insights    | Capped at 0.1 GB/day                       | Stops ingesting until the next day                     |
| Log Analytics           | 5 GB/month free; capped at 0.1 GB/day      | Stops ingesting until the next day                     |
| Budget alert            | Free                                       | Emails you at the first cent of actual spend           |

The failure modes and how to recover from them are in docs/runbook.md (phase 7).
