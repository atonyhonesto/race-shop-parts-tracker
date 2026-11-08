/**
 * The only API the renderer gets from the main process (ADR 0009). It is deliberately small:
 * no tokens, no file paths, no Node.js. API calls don't go through here at all; the renderer
 * calls /api on its own app:// origin and the main process forwards them with credentials.
 */

export type AuthMode = 'entra' | 'dev';

/** Mirrors the screens package's SignedInUser (kept structural so main has no React dependency). */
export interface BridgeUser {
  name: string;
  roles: readonly ('CrewChief' | 'PartsManager')[];
}

export interface RaceShopBridge {
  authMode: AuthMode;
  auth: {
    /** The signed-in user, or null. Works offline with the last known roles. */
    getUser: () => Promise<BridgeUser | null>;
    /** Entra: opens the system browser. Dev: signs in as the given user. */
    signIn: (devUser?: BridgeUser) => Promise<BridgeUser>;
    /** Signs out and deletes this device's offline cache. */
    signOut: () => Promise<void>;
  };
  /** Encrypted (OS-protected) storage for the offline query cache. */
  offlineCache: {
    load: () => Promise<string | null>;
    save: (value: string) => Promise<void>;
    remove: () => Promise<void>;
  };
}

export const Channels = {
  getUser: 'auth:get-user',
  signIn: 'auth:sign-in',
  signOut: 'auth:sign-out',
  cacheLoad: 'offline-cache:load',
  cacheSave: 'offline-cache:save',
  cacheRemove: 'offline-cache:remove',
} as const;

/** The origin the renderer is served from. IPC and navigation are only trusted from here. */
export const APP_ORIGIN = 'app://bundle';
