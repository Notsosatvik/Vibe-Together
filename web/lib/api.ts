// Tiny API client. All calls include cookies (cross-site → API at api.railway.app)
// AND a localStorage-backed Authorization header fallback for browsers that
// block third-party cookies (Safari ITP, Brave, Chrome Incognito, etc.).
//
// The fallback tokens are seeded from the OAuth-callback URL fragment by
// bootstrapAuthFromHash() and refreshed by the /auth/refresh response body.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://vibe-together-production.up.railway.app";

const ACCESS_KEY = "vt_access";
const REFRESH_KEY = "vt_refresh";

function readToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeToken(key: string, val: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (val) window.localStorage.setItem(key, val);
    else window.localStorage.removeItem(key);
  } catch {
    /* private mode etc. — best effort */
  }
}

/**
 * Read tokens from the URL fragment (set by the API OAuth callback) into
 * localStorage, then strip the fragment so they don't sit in history.
 * Safe to call on every page — it no-ops when there's no auth fragment.
 */
export function bootstrapAuthFromHash() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;
  const params = new URLSearchParams(hash.slice(1));
  const a = params.get("a");
  const r = params.get("r");
  if (!a && !r) return;
  if (a) writeToken(ACCESS_KEY, a);
  if (r) writeToken(REFRESH_KEY, r);
  // strip the fragment without scrolling/reloading
  const clean = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", clean);
}

// Run the bootstrap eagerly at module load on the client so tokens from the
// OAuth callback land in localStorage BEFORE any React effects fire. (React's
// mount order is child-before-parent, so doing it only in <TokenBootstrap/>
// inside the root layout would race with useMe() on the post-redirect page.)
if (typeof window !== "undefined") {
  try {
    bootstrapAuthFromHash();
  } catch {
    /* never let a bad fragment crash the module */
  }
}

export type ApiError = { status: number; message: string };

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const access = readToken(ACCESS_KEY);
  if (access && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${access}`;
  }
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
}

/**
 * Authenticated JSON request. Auto-refreshes the access token once on 401.
 * Throws ApiError on non-2xx (after the refresh attempt).
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let res = await rawFetch(path, init);

  if (res.status === 401 && path !== "/auth/refresh") {
    // Try a refresh — send the stored refresh token in the body as a
    // fallback when cookies aren't being delivered cross-site.
    const refreshToken = readToken(REFRESH_KEY);
    const refresh = await rawFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });
    if (refresh.ok) {
      try {
        const body = (await refresh.clone().json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (body.access_token) writeToken(ACCESS_KEY, body.access_token);
        if (body.refresh_token) writeToken(REFRESH_KEY, body.refresh_token);
      } catch {
        /* server may not return body in older versions — cookies still work */
      }
      res = await rawFetch(path, init);
    } else {
      // Refresh failed — clear stale tokens so we don't keep retrying with them
      writeToken(ACCESS_KEY, null);
      writeToken(REFRESH_KEY, null);
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw { status: res.status, message } as ApiError;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

// Convenience: kick the browser into the OAuth flow on the API.
// These are top-level navigations (not fetch) so the API can issue
// HTTP redirects to Google / Spotify and finally back to the web app.
export function startGoogleLogin() {
  window.location.href = `${API_URL}/auth/google`;
}

export async function startSpotifyConnect() {
  // Spotify connect is a top-level navigation (it 302s to Spotify), so we
  // can't attach Authorization headers. If cookies aren't being delivered
  // cross-site, mint a 60-second one-time ticket and pass that in the URL.
  // The ticket is far shorter-lived than the access token and is the same
  // pattern used by other token-fallback OAuth flows.
  try {
    const { ticket } = await apiFetch<{ ticket: string }>("/auth/ticket", {
      method: "POST",
      body: JSON.stringify({}),
    });
    window.location.href = `${API_URL}/spotify/connect?ticket=${encodeURIComponent(ticket)}`;
    return;
  } catch {
    // No ticket — fall back to the plain cookie-based path. Will succeed
    // if the browser is sending the access_token cookie cross-site.
    window.location.href = `${API_URL}/spotify/connect`;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    /* even on error, we clear local state */
  }
  writeToken(ACCESS_KEY, null);
  writeToken(REFRESH_KEY, null);
}
