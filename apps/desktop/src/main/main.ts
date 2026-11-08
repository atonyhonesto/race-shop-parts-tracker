import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  net,
  protocol,
  safeStorage,
  session,
  shell,
} from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

import { APP_ORIGIN, Channels } from '../shared/bridge';
import type { BridgeUser } from '../shared/bridge';
import { buildUpstreamRequest, problem } from './apiProxy';
import { createDevAuth, createEntraAuth } from './auth';
import type { AuthService } from './auth';
import { readConfig } from './config';
import { EncryptedFile } from './encryptedFile';
import {
  CONTENT_SECURITY_POLICY,
  isSafeExternalUrl,
  isTrustedAppUrl,
  resolveRendererFile,
} from './security';

/*
 * Electron main process (ADR 0009). The renderer is an ordinary sandboxed web page served from
 * app://bundle. Everything privileged happens here: sign-in, tokens, the API proxy, encrypted
 * storage. The renderer reaches it only through the preload bridge (src/preload) and /api.
 */

// Must run before 'ready': app:// behaves like https (secure context, fetch, standard URLs).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
  },
]);

// Tests run each app instance with its own data folder; packaged builds always use the default.
if (!app.isPackaged && process.env.RACESHOP_USER_DATA_DIR) {
  app.setPath('userData', process.env.RACESHOP_USER_DATA_DIR);
}

if (!app.requestSingleInstanceLock()) app.quit();

const config = readConfig(
  { ...import.meta.env, RACESHOP_API_BASE_URL: process.env.RACESHOP_API_BASE_URL },
  app.isPackaged,
);
const MAX_OFFLINE_CACHE_CHARS = 20 * 1024 * 1024;

let mainWindow: BrowserWindow | null = null;

function openExternalIfSafe(url: string): void {
  if (isSafeExternalUrl(url)) void shell.openExternal(url);
}

// Every web contents (window, devtools, anything): no navigation away, no new windows, no webviews.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isTrustedAppUrl(url)) {
      event.preventDefault();
      openExternalIfSafe(url);
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    openExternalIfSafe(url);
    return { action: 'deny' };
  });
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

app.on('second-instance', () => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.focus();
});

app.on('window-all-closed', () => {
  app.quit();
});

void app.whenReady().then(() => {
  const userData = app.getPath('userData');
  const rendererDir = join(app.getAppPath(), 'dist', 'renderer');
  const offlineCache = new EncryptedFile(join(userData, 'offline-cache.bin'), safeStorage);
  const auth: AuthService =
    config.entra === null
      ? createDevAuth()
      : createEntraAuth(
          config.entra,
          new EncryptedFile(join(userData, 'msal-cache.bin'), safeStorage),
          new EncryptedFile(join(userData, 'last-user.bin'), safeStorage),
          (url) => shell.openExternal(url),
        );

  // No camera, microphone, notifications, geolocation, ... The app needs none of them.
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    if (!isTrustedAppUrl(request.url)) return new Response('Not found', { status: 404 });
    if (url.pathname.startsWith('/api/')) return proxyToApi(request, auth);

    const file = resolveRendererFile(rendererDir, url.pathname);
    if (!file) return new Response('Not found', { status: 404 });
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { status: response.status, headers });
  });

  registerIpc(auth, offlineCache);

  if (app.isPackaged) Menu.setApplicationMenu(null);
  mainWindow = createWindow();
});

async function proxyToApi(request: Request, auth: AuthService): Promise<Response> {
  let credentials: Record<string, string> | null;
  try {
    credentials = await auth.getRequestHeaders();
  } catch {
    credentials = null;
  }
  if (!credentials) {
    return problem(401, 'Sign-in required', 'sign_in_required', 'Sign in again to continue.');
  }

  const upstream = await buildUpstreamRequest(request, config.apiBaseUrl, credentials);
  try {
    return await net.fetch(upstream.url, upstream.init);
  } catch {
    return problem(
      503,
      'API unreachable',
      'api_unreachable',
      'Could not reach the Race Shop API. Check your connection.',
    );
  }
}

/** IPC handlers accept calls only from our own page, and validate every argument. */
function registerIpc(auth: AuthService, offlineCache: EncryptedFile): void {
  function handle(channel: string, handler: (...args: unknown[]) => unknown): void {
    ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
      if (!isTrustedAppUrl(event.senderFrame?.url))
        throw new Error('IPC call from an untrusted page.');
      return handler(...args);
    });
  }

  handle(Channels.getUser, () => auth.getUser());
  handle(Channels.signIn, (devUser) => auth.signIn(parseDevUser(devUser)));
  handle(Channels.signOut, async () => {
    await auth.signOut();
    await offlineCache.remove(); // the next person on this PC must not see this user's data
  });
  handle(Channels.cacheLoad, () => offlineCache.read());
  handle(Channels.cacheSave, (value) => {
    if (typeof value !== 'string' || value.length > MAX_OFFLINE_CACHE_CHARS) {
      throw new Error('Offline cache must be a string under 20 MB.');
    }
    return offlineCache.write(value);
  });
  handle(Channels.cacheRemove, () => offlineCache.remove());
}

function parseDevUser(value: unknown): BridgeUser | undefined {
  if (config.authMode !== 'dev' || typeof value !== 'object' || value === null) return undefined;
  const { name, roles } = value as { name?: unknown; roles?: unknown };
  if (typeof name !== 'string' || !Array.isArray(roles)) return undefined;
  return {
    name: name.slice(0, 100),
    roles: roles.filter((role) => role === 'CrewChief' || role === 'PartsManager'),
  };
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 480,
    show: false,
    title: 'Race Shop Parts Tracker',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
    },
  });
  window.once('ready-to-show', () => {
    window.show();
  });
  void window.loadURL(`${APP_ORIGIN}/index.html`);
  return window;
}
