import '@raceshop/ui/styles.css';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createQueryClient, routes, syncOnlineStatusWithBrowser } from '@raceshop/screens';

import { DesktopAuthProvider } from './DesktopAuthProvider';
import { createBridgePersister } from './persister';

/** How long the offline parts list is kept on this device (ADR 0008). */
const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Persisted queries are only restored while still in the cache, so keep them as long as the offline copy.
// The app may well be opened in the garage with no connection; start in the right mode.
syncOnlineStatusWithBrowser();
const queryClient = createQueryClient({ gcTime: OFFLINE_MAX_AGE_MS });
const persister = createBridgePersister(window.raceshop.offlineCache);
// Same routes and screens as the web app; hash history because the page is served from app://.
const router = createHashRouter(routes);

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing from index.html');

createRoot(root).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      // A new app version may change response shapes, so it starts with an empty cache.
      persistOptions={{ persister, maxAge: OFFLINE_MAX_AGE_MS, buster: __APP_VERSION__ }}
    >
      <DesktopAuthProvider>
        <RouterProvider router={router} />
      </DesktopAuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
