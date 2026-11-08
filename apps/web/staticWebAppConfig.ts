import type { Plugin } from 'vite';

/**
 * Azure Static Web Apps settings for the production build: SPA routing, caching and security
 * headers. Generated at build time because the CSP must name the API's origin, which differs per
 * environment (VITE_API_BASE_URL).
 */
export function staticWebAppConfig(apiBaseUrl: string): object {
  const api = new URL(apiBaseUrl).origin;
  const entra = 'https://login.microsoftonline.com';
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // The life-gauge web component injects its shadow-DOM styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // Only the API and Entra ID sign-in (MSAL token requests and its hidden renewal iframe).
    `connect-src 'self' ${api} ${entra}`,
    `frame-src ${entra}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  return {
    navigationFallback: {
      rewrite: '/index.html',
      exclude: ['/assets/*', '/*.{js,css,map,svg,png,ico,json,txt}'],
    },
    routes: [
      // File names contain a content hash, so they can be cached forever.
      { route: '/assets/*', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
      { route: '/index.html', headers: { 'Cache-Control': 'no-cache' } },
    ],
    globalHeaders: {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    mimeTypes: { '.json': 'application/json' },
  };
}

/** Emits staticwebapp.config.json into the build output when an API URL is configured. */
export function staticWebAppConfigPlugin(apiBaseUrl: string | undefined): Plugin {
  return {
    name: 'raceshop:static-web-app-config',
    apply: 'build',
    generateBundle() {
      if (!apiBaseUrl) return;
      this.emitFile({
        type: 'asset',
        fileName: 'staticwebapp.config.json',
        source: `${JSON.stringify(staticWebAppConfig(apiBaseUrl), null, 2)}\n`,
      });
    },
  };
}
