// Tiny API client. All calls include cookies (cross-site → API at api.railway.app)
// and auto-refresh once on 401 before giving up.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://vibe-together-production.up.railway.app";

export type ApiError = { status: number; message: string };

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
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
    // Try a refresh, then retry the original call once.
    const refresh = await rawFetch("/auth/refresh", { method: "POST" });
    if (refresh.ok) {
      res = await rawFetch(path, init);
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

export function startSpotifyConnect() {
  window.location.href = `${API_URL}/spotify/connect`;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    /* even on error, we clear local state */
  }
}
