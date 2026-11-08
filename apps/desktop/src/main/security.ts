import { resolve, sep } from 'node:path';

import { APP_ORIGIN } from '../shared/bridge';

/*
 * Pure security checks for the main process (ADR 0009), kept free of Electron so they are unit-tested.
 */

const appUrl = new URL(APP_ORIGIN);

/**
 * True only for pages served from our own app:// origin. Compares protocol and host, not
 * `origin`: Node's URL gives non-special schemes like app: an opaque origin ("null").
 */
export function isTrustedAppUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === appUrl.protocol && parsed.host === appUrl.host;
  } catch {
    return false;
  }
}

/** Links the app may hand to the system browser: https only (no file:, javascript:, smb:, ...). */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Maps an app:// path to a file inside the renderer folder, refusing anything outside it. */
export function resolveRendererFile(rendererDir: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = decoded === '/' || decoded === '' ? 'index.html' : decoded.replace(/^\/+/, '');
  const root = resolve(rendererDir);
  const full = resolve(root, relative);
  return full.startsWith(root + sep) ? full : null;
}

/**
 * Sent with every page. Scripts only from the app itself; network only to the app's own origin
 * (API calls are proxied through it); no plugins, frames or base-URL tricks.
 * Styles allow 'unsafe-inline' because the life-gauge web component injects its shadow-DOM styles.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
