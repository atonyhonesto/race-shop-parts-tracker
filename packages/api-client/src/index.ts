/**
 * Typed client for the Race Shop Parts Tracker API, generated from openapi.json (ADR 0005).
 * Framework-agnostic: callers set the base URL and auth with `client.setConfig` and interceptors.
 */
export * from './generated';
export { client } from './generated/client.gen';

import type { ProblemDetails } from './generated';

/** Error body for 404/409 responses. `code` is stable and safe to switch on (e.g. "part.life_expired"). */
export type ApiProblem = ProblemDetails & { code?: string; traceId?: string };
