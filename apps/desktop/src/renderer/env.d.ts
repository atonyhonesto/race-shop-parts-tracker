/// <reference types="vite/client" />
import type { RaceShopBridge } from '../shared/bridge';

declare global {
  interface Window {
    /** Exposed by the preload script (src/preload/preload.ts). */
    raceshop: RaceShopBridge;
  }

  /** App version from package.json, injected at build time. */
  const __APP_VERSION__: string;
}
