# 0009. Desktop app: tokens and privileges stay in the main process

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

The Electron app shows the same React screens as the web app (`packages/screens`). An Electron
renderer that can reach Node.js, or that holds access tokens, turns any cross-site scripting bug
into code execution on the user's PC or a stolen token. Microsoft's guidance for desktop sign-in is
the system browser with a loopback redirect, not an embedded login window. That needs MSAL Node,
which runs only in the main process.

## Decision

**The renderer is an ordinary, sandboxed web page:**

- It is served from a custom privileged scheme, `app://bundle` (secure context, standard URLs), not
  `file://`.
- `contextIsolation`, `sandbox`, `nodeIntegration: false` and `webviewTag: false` are set, with a
  strict CSP sent as a response header.
- It sees one bridge on `window.raceshop` (`src/shared/bridge.ts`): who is signed in, sign in, sign
  out, and load/save/remove of the encrypted offline cache. There is no `ipcRenderer`, Node API or
  file path.

**API calls go through the main process:**

- The renderer calls `/api/...` on its own origin, exactly like the web app (where Vite or Static
  Web Apps proxies it).
- The `app://` protocol handler forwards the call to the configured API. It adds the bearer token
  (or, in dev builds, the Dev scheme headers) and drops any credential headers the renderer tried to
  set. The renderer can choose neither the host nor its identity.
- **The renderer never holds a token.** This goes further than the original plan, which was to give
  the renderer access tokens over IPC. It also needs no CORS.

**Sign-in (MSAL Node, main process):**

- `acquireTokenInteractive` opens the system browser via `shell.openExternal`, but only for
  `https://login.microsoftonline.com/`. The redirect returns to `http://localhost:<port>`
  (authorization code with PKCE).
- The MSAL token cache is encrypted with `safeStorage` (Windows DPAPI) through a small cache
  plugin. `@azure/msal-node-extensions` was not used, because it brings native modules (`keytar`,
  which is archived, and `msal-node-runtime`) that would have to be rebuilt for Electron.
- Offline, the last known name and roles (also encrypted) allow read-only use. See ADR 0008.

**Hardening in the main process:**

- Navigation away from `app://bundle` is blocked, and `https` links open in the system browser.
- New windows and webviews are denied, and so is every permission request (camera, notifications,
  ...).
- IPC handlers accept calls only from `app://bundle` and validate every argument (sizes, types,
  roles).
- Packaged builds:
  - **Electron fuses:** no `ELECTRON_RUN_AS_NODE`, no `NODE_OPTIONS`, no `--inspect`, and asar
    integrity validation with asar-only loading.
  - **HTTPS only:** the API URL must use HTTPS.
  - **No overrides:** the API URL and auth settings are baked in at build time and can't be
    changed with environment variables.
- Everything is bundled by Vite, so the installer contains no `node_modules` and no native modules.

## Consequences

- **Easier:**
  - The renderer is the same code as the web app.
  - A script injected into the page can read what is on screen, but can't steal a token, read
    files, or call the API as someone else.
  - Credential rules (headers dropped, hosts fixed) are pure functions with unit tests.
- **Harder:**
  - Every API call is one extra in-process hop. This is negligible next to the network round trip.
  - Playwright can't attach to a packaged build, because the inspector fuse is off. End-to-end tests
    drive the unpacked dev build, and a separate check reads the fuses back from the packaged
    executable.
  - The installer is **unsigned**, because code-signing certificates cost money and the project is
    capped at free tiers. Windows SmartScreen warns on first run. Build provenance attestations and
    SHA-256 checksums on each release let users verify where the file came from.

## Alternatives considered

- **Renderer gets tokens over IPC (original plan).** Works, but a renderer compromise then exposes a
  bearer token for its lifetime. Proxying removes the token from the renderer entirely.
- **MSAL Browser in the renderer.** An `app://` or `file://` page can't be a browser sign-in
  redirect target, and tokens would live in renderer storage.
- **Embedded sign-in window.** Discouraged by Microsoft. It breaks single sign-on, passkeys and
  Conditional Access, and the app could read the password.
- **Electron Forge with Squirrel.Windows.** Official tooling, but Squirrel installs per-user into a
  hidden folder with limited options. electron-builder's NSIS installer is more conventional for
  IT, and its fuse configuration is built in.
