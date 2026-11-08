/*
 * The app's screens, shared by the web app and the Electron app (ADR 0002, 0009).
 * Each app supplies only what differs: the sign-in provider (an AuthContext value) and the router
 * (browser history on the web, hash history in Electron). Everything else is here, written once.
 */
export { ApiError, createQueryClient, inventoryKeys, PAGE_SIZE } from './api/inventory';
export { AuthContext, canManageInventory, hasAnyRole, toAppRoles, useAuth } from './auth/auth';
export type { AppRole, Auth, SignedInUser } from './auth/auth';
export { DevSignIn } from './auth/DevSignIn';
export { SignInLayout } from './auth/SignInLayout';
export {
  OfflineBanner,
  PendingState,
  syncOnlineStatusWithBrowser,
  useOnlineStatus,
} from './offline/offline';
export { routes } from './router';
