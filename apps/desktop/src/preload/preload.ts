import { contextBridge, ipcRenderer } from 'electron';

import { Channels } from '../shared/bridge';
import type { BridgeUser, RaceShopBridge } from '../shared/bridge';

/*
 * Runs in the sandboxed renderer before the page. Exposes exactly the RaceShopBridge API on
 * window.raceshop; the page never gets ipcRenderer itself (ADR 0009).
 */
const bridge: RaceShopBridge = {
  authMode: import.meta.env.VITE_AUTH_MODE === 'dev' ? 'dev' : 'entra',
  auth: {
    getUser: () => ipcRenderer.invoke(Channels.getUser) as Promise<BridgeUser | null>,
    signIn: (devUser) => ipcRenderer.invoke(Channels.signIn, devUser) as Promise<BridgeUser>,
    signOut: () => ipcRenderer.invoke(Channels.signOut) as Promise<void>,
  },
  offlineCache: {
    load: () => ipcRenderer.invoke(Channels.cacheLoad) as Promise<string | null>,
    save: (value) => ipcRenderer.invoke(Channels.cacheSave, value) as Promise<void>,
    remove: () => ipcRenderer.invoke(Channels.cacheRemove) as Promise<void>,
  },
};

contextBridge.exposeInMainWorld('raceshop', bridge);
