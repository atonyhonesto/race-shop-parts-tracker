# Entra ID setup

One-time setup of the Microsoft Entra ID app registrations used for sign-in. Local development and
the integration tests don't need any of this. They use the header-based Dev scheme (see
[CONTRIBUTING.md](../../CONTRIBUTING.md#run-the-api-locally)).

| Registration                    | Type          | Purpose                                                                   |
| ------------------------------- | ------------- | ------------------------------------------------------------------------- |
| Race Shop Parts Tracker API     | Web API       | Validates tokens. Defines the app roles and the `access_as_user` scope.   |
| Race Shop Parts Tracker Web     | SPA           | The React app signs users in with MSAL and requests tokens for the API.   |
| Race Shop Parts Tracker Desktop | Public client | The Electron app signs in through the system browser (loopback redirect). |

**Cost:** app registrations and user role assignments are included in Entra ID Free. They are
directory objects, not billed Azure resources. Assigning _groups_ to app roles needs Entra ID P1,
so this guide assigns users individually.

**Permissions:** you need the Application Developer role (or higher) in the tenant. Granting tenant-wide
consent isn't needed, because the API pre-authorizes the SPA.

## Fixed IDs

These GUIDs identify the roles and scope inside the API registration. They are not secrets, and the
commands below reuse them.

| Item                    | Value                                  |
| ----------------------- | -------------------------------------- |
| App role `CrewChief`    | `9500b3bd-e0cf-4ecb-8897-08f0c4148d96` |
| App role `PartsManager` | `842418e1-cd96-46d7-8ba2-0e92a887049a` |
| Scope `access_as_user`  | `fd6d5ff7-1aa6-4248-bb2a-15e5dd088bf2` |

## Option A: Azure CLI (bash)

Run these yourself in Git Bash, WSL or Cloud Shell. They change your tenant, so nothing in this
repository runs them automatically.

```bash
az login --tenant <your-tenant-id-or-domain> --allow-no-subscriptions

TENANT_ID=$(az account show --query tenantId -o tsv)
CREW_CHIEF_ROLE=9500b3bd-e0cf-4ecb-8897-08f0c4148d96
PARTS_MANAGER_ROLE=842418e1-cd96-46d7-8ba2-0e92a887049a
SCOPE_ID=fd6d5ff7-1aa6-4248-bb2a-15e5dd088bf2
```

### 1. API registration with app roles and a scope

```bash
API_APP_ID=$(az ad app create \
  --display-name "Race Shop Parts Tracker API" \
  --sign-in-audience AzureADMyOrg \
  --query appId -o tsv)
API_OBJECT_ID=$(az ad app show --id "$API_APP_ID" --query id -o tsv)

az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/$API_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body "$(cat <<EOF
{
  "identifierUris": ["api://$API_APP_ID"],
  "api": {
    "requestedAccessTokenVersion": 2,
    "oauth2PermissionScopes": [{
      "id": "$SCOPE_ID",
      "value": "access_as_user",
      "type": "User",
      "isEnabled": true,
      "adminConsentDisplayName": "Use Race Shop Parts Tracker",
      "adminConsentDescription": "Lets the app call the Race Shop Parts Tracker API as the signed-in user.",
      "userConsentDisplayName": "Use Race Shop Parts Tracker",
      "userConsentDescription": "Lets the app call the Race Shop Parts Tracker API as you."
    }]
  },
  "appRoles": [
    {
      "id": "$CREW_CHIEF_ROLE",
      "value": "CrewChief",
      "displayName": "Crew chief",
      "description": "View parts, cars, life status and install history.",
      "allowedMemberTypes": ["User"],
      "isEnabled": true
    },
    {
      "id": "$PARTS_MANAGER_ROLE",
      "value": "PartsManager",
      "displayName": "Parts manager",
      "description": "Everything a crew chief can do, plus install, remove and retire parts.",
      "allowedMemberTypes": ["User"],
      "isEnabled": true
    }
  ]
}
EOF
)"

# Enterprise application (service principal). Users without a role assignment cannot get a token.
az ad sp create --id "$API_APP_ID"
az ad sp update --id "$API_APP_ID" --set appRoleAssignmentRequired=true
```

### 2. SPA registration

`http://localhost:5173` is the Vite dev server (phase 3). The Static Web Apps URL is added in phase 5.

```bash
SPA_APP_ID=$(az ad app create \
  --display-name "Race Shop Parts Tracker Web" \
  --sign-in-audience AzureADMyOrg \
  --query appId -o tsv)
SPA_OBJECT_ID=$(az ad app show --id "$SPA_APP_ID" --query id -o tsv)

az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/$SPA_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body "$(cat <<EOF
{
  "spa": { "redirectUris": ["http://localhost:5173"] },
  "requiredResourceAccess": [{
    "resourceAppId": "$API_APP_ID",
    "resourceAccess": [{ "id": "$SCOPE_ID", "type": "Scope" }]
  }]
}
EOF
)"
az ad sp create --id "$SPA_APP_ID"
```

### 2b. Desktop app registration (public client)

The Electron app signs in through the system browser and returns to a loopback address
(`http://localhost` on a random port, with PKCE). Entra ID accepts any port for a `localhost`
redirect on a public client. There is no client secret.

```bash
DESKTOP_APP_ID=$(az ad app create \
  --display-name "Race Shop Parts Tracker Desktop" \
  --sign-in-audience AzureADMyOrg \
  --query appId -o tsv)
DESKTOP_OBJECT_ID=$(az ad app show --id "$DESKTOP_APP_ID" --query id -o tsv)

az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/$DESKTOP_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body "$(cat <<EOF
{
  "isFallbackPublicClient": true,
  "publicClient": { "redirectUris": ["http://localhost"] },
  "requiredResourceAccess": [{
    "resourceAppId": "$API_APP_ID",
    "resourceAccess": [{ "id": "$SCOPE_ID", "type": "Scope" }]
  }]
}
EOF
)"
az ad sp create --id "$DESKTOP_APP_ID"
```

### 3. Pre-authorize the web and desktop apps on the API

This lets users sign in without a consent prompt, and without an admin granting consent for the
whole tenant.

A PATCH to `api` replaces the **whole** `api` object, so this repeats the scope from step 1.
Sending only `preAuthorizedApplications` would try to delete the scope, and Graph rejects that.

```bash
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/$API_OBJECT_ID" \
  --headers "Content-Type=application/json" \
  --body "$(cat <<EOF
{
  "api": {
    "requestedAccessTokenVersion": 2,
    "oauth2PermissionScopes": [{
      "id": "$SCOPE_ID",
      "value": "access_as_user",
      "type": "User",
      "isEnabled": true,
      "adminConsentDisplayName": "Use Race Shop Parts Tracker",
      "adminConsentDescription": "Lets the app call the Race Shop Parts Tracker API as the signed-in user.",
      "userConsentDisplayName": "Use Race Shop Parts Tracker",
      "userConsentDescription": "Lets the app call the Race Shop Parts Tracker API as you."
    }],
    "preAuthorizedApplications": [
      { "appId": "$SPA_APP_ID", "delegatedPermissionIds": ["$SCOPE_ID"] },
      { "appId": "$DESKTOP_APP_ID", "delegatedPermissionIds": ["$SCOPE_ID"] }
    ]
  }
}
EOF
)"
```

### 4. Assign roles to people

```bash
API_SP_ID=$(az ad sp show --id "$API_APP_ID" --query id -o tsv)

assign_role() { # usage: assign_role <user-principal-name> <role-id>
  local user_id
  user_id=$(az ad user show --id "$1" --query id -o tsv)
  az rest --method POST \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$API_SP_ID/appRoleAssignedTo" \
    --headers "Content-Type=application/json" \
    --body "{\"principalId\":\"$user_id\",\"resourceId\":\"$API_SP_ID\",\"appRoleId\":\"$2\"}"
}

assign_role alex@yourtenant.onmicrosoft.com  "$PARTS_MANAGER_ROLE"
assign_role casey@yourtenant.onmicrosoft.com "$CREW_CHIEF_ROLE"
```

### 5. Values the apps need

```bash
echo "Tenant ID:   $TENANT_ID"
echo "API app ID:  $API_APP_ID   (AzureAd:ClientId for the API)"
echo "SPA app ID:  $SPA_APP_ID   (VITE_ENTRA_CLIENT_ID in apps/web)"
echo "Desktop ID:  $DESKTOP_APP_ID   (ENTRA_DESKTOP_CLIENT_ID repository variable)"
echo "API scope:   api://$API_APP_ID/access_as_user"
```

For the web app, put them in `apps/web/.env.local`: `VITE_AUTH_MODE=entra`,
`VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID` (the SPA app ID), and
`VITE_API_SCOPE=api://<api-app-id>/access_as_user`.

For the desktop installer, set them as repository **variables** (Settings → Secrets and variables
→ Actions → Variables): `ENTRA_TENANT_ID`, `ENTRA_DESKTOP_CLIENT_ID`,
`API_SCOPE=api://<api-app-id>/access_as_user` and `DESKTOP_API_BASE_URL` (the API's HTTPS URL, from
phase 5). The release workflow bakes them into the app.

None of these values are secrets. The API validates tokens with Entra ID's public signing keys,
and both apps are public clients, so there is no client secret or certificate to store.

## Option B: Azure portal

1. **Entra ID → App registrations → New registration**: "Race Shop Parts Tracker API", single tenant,
   no redirect URI.
2. **Expose an API**: set the Application ID URI to `api://<client-id>`, then add the scope
   `access_as_user` (who can consent: admins and users).
3. **App roles**: create `CrewChief` and `PartsManager`. Allowed member types: Users/Groups. Use the
   values exactly, because the API matches them by name.
4. **Manifest**: set `requestedAccessTokenVersion` to `2`.
5. **New registration**: "Race Shop Parts Tracker Web". Under **Authentication**, add the
   **Single-page application** platform with redirect URI `http://localhost:5173`. Under
   **API permissions**, add the API's `access_as_user` delegated permission.
6. **New registration**: "Race Shop Parts Tracker Desktop". Under **Authentication**, add the
   **Mobile and desktop applications** platform with redirect URI `http://localhost`, and set
   "Allow public client flows" to **Yes**. Under **API permissions**, add `access_as_user`.
7. Back on the API, under **Expose an API → Add a client application**, add the SPA's and the
   desktop app's client IDs, each with `access_as_user`.
8. **Enterprise applications → Race Shop Parts Tracker API → Properties**: set "Assignment required?"
   to **Yes**. Then **Users and groups → Add user/group**: assign each person a role.

## Point the API at the tenant

Locally, if you want to try real tokens instead of the Dev scheme:

```sh
cd api/src/RaceShop.Api
dotnet user-secrets set Authentication:Mode Entra
dotnet user-secrets set AzureAd:TenantId <tenant-id>
dotnet user-secrets set AzureAd:ClientId <api-app-id>
```

In Azure (phase 5), the same settings are App Service app settings: `Authentication__Mode=Entra`,
`AzureAd__TenantId`, `AzureAd__ClientId`. The API fails at startup if either ID is missing, so a
misconfigured deploy shows up immediately rather than on the first request.

## How the API checks a token

| Check                                    | Where                                              |
| ---------------------------------------- | -------------------------------------------------- |
| Signature, issuer, audience, lifetime    | Microsoft.Identity.Web (JWT bearer)                |
| Delegated scope `access_as_user` present | `ReadInventory` / `ManageInventory` policies       |
| `CrewChief` or `PartsManager` role       | `ReadInventory` policy (all endpoints)             |
| `PartsManager` role                      | `ManageInventory` policy (install, remove, retire) |
| Any endpoint without a policy            | Fallback policy: requires an authenticated user    |

The policies live in [Authorization.cs](../../api/src/RaceShop.Api/Auth/Authorization.cs). The tests
in `api/tests/RaceShop.IntegrationTests/Security` cover 401, 403, and the startup guards.
