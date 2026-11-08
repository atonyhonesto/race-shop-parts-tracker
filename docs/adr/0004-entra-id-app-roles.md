# 0004. Use Entra ID app roles for authorization

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Two kinds of users need different rights:

- **Crew chiefs** need to see parts, life status and what is on each car.
- **Parts managers** do all of that and also install, remove and retire parts. These changes
  affect whether a car is safe to run.

The organization already signs in with Microsoft Entra ID, so the app should not manage passwords.
The web and desktop apps need the same rules. Local development and CI must not depend on a real
tenant.

## Decision

- **Authentication:** the API accepts Entra ID access tokens (JWT bearer), validated by
  Microsoft.Identity.Web. Clients use MSAL to get tokens (phase 3).
- **Authorization:** use **app roles** (`CrewChief`, `PartsManager`) defined on the API
  registration. They are assigned to users in Entra ID and arrive in the token's `roles` claim.
  Two policies map them to capabilities:
  - `ReadInventory`: either role, plus the delegated scope `access_as_user`. Applied to the whole
    `/api` group.
  - `ManageInventory`: `PartsManager`, plus the scope. Added to every endpoint that changes data.
- **Fail closed:**
  - A fallback policy requires an authenticated user on any endpoint that forgets a policy.
  - A test enumerates every route and fails if an endpoint lacks the right policy.
  - The enterprise application has "assignment required" on, so a user without a role can't even
    get a token.
- **Development and tests:** a header-based `Dev` authentication scheme produces the same claim
  shapes as a real token, so the same policies run everywhere. Startup **fails** if it is enabled
  in any environment other than Development or Testing, and a test proves it.
- **No secrets:** the API only validates tokens using Entra ID's public signing keys. There is no
  client secret or certificate to store or rotate.

## Consequences

- **Easier:**
  - Who-can-do-what is managed in Entra ID by an admin, not in our database.
  - Policies are named by capability, so a third role means changing two policy definitions and
    leaving the endpoints alone.
  - 401/403 behavior is tested without a tenant.
- **Harder:**
  - Role changes take effect only when the user's next token is issued (up to about an hour).
  - Assigning _groups_ to roles needs Entra ID P1, so on the free tier roles are assigned per user.
  - The Dev scheme is a sharp tool. Its safety relies on the environment guard and that guard's
    test.
- **Not covered:** per-team or per-car data ownership, such as a crew chief seeing only their own
  car. That would need resource-based authorization and isn't required yet.

## Alternatives considered

- **Security groups in the `groups` claim.** These are tenant-specific object IDs rather than
  names, and the claim overflows past 200 groups. App roles are scoped to this app and readable.
- **Roles in our own database.** Duplicates identity management and adds an admin UI to build and
  secure. It isn't worth it while Entra ID already holds the users.
- **Scopes only (`Parts.Read`, `Parts.Write`).** Scopes describe what the _client app_ may do on
  the user's behalf, not what the _user_ may do. A crew chief using the official SPA would still
  get `Parts.Write`. We need user-level rights, which is what app roles are for.
- **A mock token issuer for tests.** More realistic than the Dev scheme, but it adds keys, a
  metadata endpoint and an extra package. The Entra-mode tests already cover "no bearer token →
  401", and Microsoft.Identity.Web's own tests cover token validation.
