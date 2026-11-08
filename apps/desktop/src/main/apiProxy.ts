/**
 * Forwards the renderer's /api requests to the real API, adding credentials in the main process
 * (ADR 0009). The renderer never sees a token, and can't choose the target host or set identity
 * headers itself: anything it sends that looks like credentials is dropped.
 */

/** Request headers the renderer may pass through. Everything else is dropped. */
const ALLOWED_HEADERS = ['accept', 'accept-language', 'content-type'];

export interface UpstreamRequest {
  url: string;
  init: { method: string; headers: Record<string, string>; body?: ArrayBuffer };
}

export async function buildUpstreamRequest(
  request: Request,
  apiBaseUrl: string,
  authHeaders: Record<string, string>,
): Promise<UpstreamRequest> {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/')) {
    throw new Error(`Not an API path: ${incoming.pathname}`);
  }

  // Only the path and query come from the renderer; the origin is always the configured API.
  const url = new URL(incoming.pathname + incoming.search, apiBaseUrl).toString();

  const headers: Record<string, string> = {};
  for (const name of ALLOWED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  Object.assign(headers, authHeaders);

  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return {
    url,
    init: { method, headers, ...(hasBody ? { body: await request.arrayBuffer() } : {}) },
  };
}

/** A problem-details response produced by the proxy itself (not the API). */
export function problem(status: number, title: string, code: string, detail: string): Response {
  return new Response(JSON.stringify({ status, title, detail, code }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
