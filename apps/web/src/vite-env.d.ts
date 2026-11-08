/// <reference types="vite/client" />

/** Build-time settings (see .env.example). None are secrets: they end up in the browser bundle. */
interface ImportMetaEnv {
  readonly VITE_AUTH_MODE?: 'dev' | 'entra';
  /** Production: the API's origin (App Service). Unset locally, where Vite proxies /api. */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_API_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
