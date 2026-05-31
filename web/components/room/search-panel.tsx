"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  Music,
  ListMusic,
  ChevronLeft,
} from "lucide-react";
import {
  searchSpotifyTracks,
  getMyPlaylists,
  playlistTrackTotal,
  getPlaylistTracks,
  SpotifyApiError,
  type SpotifyTrack,
  type SpotifyPlaylist,
} from "@/lib/hooks/use-spotify-player";
import { startSpotifyConnect } from "@/lib/api";

type Tab = "search" | "playlists";

/**
 * Snapshot of the metadata we need to optimistically render a queue row before
 * the server confirms the add. The room player adds an "opt-…" placeholder
 * using these fields, then swaps it out when `room:state` arrives with the
 * authoritative QueueItemDTO.
 */
export type OptimisticTrack = {
  uri: string;
  name: string;
  artistName: string;
  albumArtUrl: string | null;
  durationMs: number;
};

/** Convert a raw Spotify catalog track into the shape the queue UI expects. */
function toOptimistic(track: SpotifyTrack): OptimisticTrack {
  const images = Array.isArray(track.album?.images) ? track.album.images : [];
  const albumArtUrl = images[0]?.url ?? images[images.length - 1]?.url ?? null;
  const artistName = Array.isArray(track.artists)
    ? track.artists.map((a) => a?.name).filter(Boolean).join(", ")
    : "";
  return {
    uri: track.uri,
    name: track.name ?? "Untitled track",
    artistName,
    albumArtUrl,
    durationMs: track.duration_ms ?? 0,
  };
}

/**
 * Host's "Add music" surface. Two tabs:
 *   - Search:    typeahead against Spotify's catalog
 *   - Playlists: browse the playlists the user already follows/owns
 *
 * Both call Spotify directly from the browser using the SDK access token
 * (see lib/hooks/use-spotify-player.ts). We deliberately do *not* go through
 * our own /spotify/* proxy here — the proxy was returning 400s from Railway
 * for queries Spotify accepted fine in-browser.
 */
export function SearchPanel({
  onAdd,
}: {
  onAdd: (track: OptimisticTrack) => void;
}) {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <div className="rounded-2xl border border-neon-green/25 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-ink-950">
          <Music className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Add music</div>
          <div className="text-[11px] text-white/50">
            Search Spotify or browse playlists from your account — audio plays
            in this tab as soon as you queue it.
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-1 rounded-lg bg-white/[0.04] p-1 border border-white/8">
        <TabButton
          active={tab === "search"}
          onClick={() => setTab("search")}
          icon={<Search className="h-3.5 w-3.5" />}
          label="Search"
        />
        <TabButton
          active={tab === "playlists"}
          onClick={() => setTab("playlists")}
          icon={<ListMusic className="h-3.5 w-3.5" />}
          label="My Playlists"
        />
      </div>

      <PanelErrorBoundary>
        {tab === "search" ? (
          <SearchView onAdd={onAdd} />
        ) : (
          <PlaylistsView onAdd={onAdd} />
        )}
      </PanelErrorBoundary>
    </div>
  );
}

/**
 * Catches render-time crashes inside the search/playlists views so a single
 * weird Spotify response (or stale chunk after a deploy) doesn't take the
 * entire room down via the Next.js root error boundary.
 *
 * Class components are still the only way to implement error boundaries in
 * React 19 — there's no `useErrorBoundary` hook in core React.
 */
class PanelErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[SearchPanel] render crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="break-words">
            <div className="font-medium">Couldn&apos;t render this panel.</div>
            <div className="text-rose-200/80">
              {this.state.error.message ?? "Unknown error"} — try refreshing.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-brand-gradient text-ink-950"
          : "text-white/60 hover:text-white/85 hover:bg-white/[0.04]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ===========================================================================
// Search tab
// ===========================================================================

function SearchView({ onAdd }: { onAdd: (track: OptimisticTrack) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needsReconnect: boolean } | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      console.info("[search] querying spotify (direct):", q);
      try {
        const items = await searchSpotifyTracks(q);
        console.info(`[search] got ${items.length} results`);
        setResults(items.slice(0, 10));
      } catch (e) {
        const msg = (e as { message?: string }).message ?? "Search failed";
        console.warn("[search] failed:", msg);
        setError({ message: msg, needsReconnect: isAuthLikeError(e) });
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: taylor swift, drake, lo-fi…"
          autoFocus
          className="w-full rounded-xl bg-white/[0.05] border border-white/10 pl-9 pr-3 h-12 text-base outline-none focus:border-neon-green/60 focus:bg-white/[0.07] transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neon-green" />
        )}
      </div>

      {error && (
        <InlineError message={error.message} needsReconnect={error.needsReconnect} />
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-80 overflow-y-auto no-scrollbar">
          {results.map((t) => (
            <TrackRow
              key={t.uri}
              track={t}
              onAdd={() => {
                onAdd(toOptimistic(t));
                setQ("");
                setResults([]);
              }}
            />
          ))}
        </ul>
      )}

      {q && !loading && results.length === 0 && !error && (
        <div className="mt-3 text-xs text-white/40 px-1">
          No results for &ldquo;{q}&rdquo;. Try a different spelling.
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// My Playlists tab
// ===========================================================================

function PlaylistsView({ onAdd }: { onAdd: (track: OptimisticTrack) => void }) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; needsReconnect: boolean } | null>(null);
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    console.info("[playlists] loading user's playlists…");
    getMyPlaylists()
      .then((items) => {
        if (cancelled) return;
        console.info(`[playlists] got ${items.length} playlists`);
        setPlaylists(items);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = (e as Error).message ?? "Couldn't load playlists";
        console.warn("[playlists] failed:", msg);
        setError({ message: msg, needsReconnect: isAuthLikeError(e) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (selected) {
    return (
      <PlaylistTracksView
        playlist={selected}
        onBack={() => setSelected(null)}
        onAdd={onAdd}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-white/55">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your playlists…
      </div>
    );
  }

  if (error)
    return (
      <InlineError message={error.message} needsReconnect={error.needsReconnect} />
    );

  if (playlists.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-white/50">
        No playlists found in your Spotify account.
      </div>
    );
  }

  return (
    <ul className="space-y-1 max-h-96 overflow-y-auto no-scrollbar">
      {playlists.map((p) => {
        // Defensive — Spotify sometimes returns playlists with missing
        // images/tracks/owner (especially auto-generated ones like "Liked
        // Songs" surrogates or freshly created playlists). Crashing the
        // entire panel because of one row would be very rude.
        const images = Array.isArray(p.images) ? p.images : [];
        const thumb =
          images[images.length - 1]?.url ?? images[0]?.url ?? null;
        // Spotify renamed playlist.tracks.total → playlist.items.total in
        // the Feb 2026 Web API migration. playlistTrackTotal() prefers the
        // new field with the old one as fallback.
        const trackTotal = playlistTrackTotal(p);
        const ownerName = p.owner?.display_name ?? null;
        return (
          <li key={p.id}>
            <button
              onClick={() => setSelected(p)}
              className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05] transition-colors text-left"
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt=""
                  className="h-11 w-11 rounded object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded bg-white/5">
                  <ListMusic className="h-4 w-4 text-white/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{p.name ?? "Untitled playlist"}</div>
                <div className="text-xs text-white/50 truncate">
                  {trackTotal} track{trackTotal === 1 ? "" : "s"}
                  {ownerName ? ` · ${ownerName}` : ""}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PlaylistTracksView({
  playlist,
  onBack,
  onAdd,
}: {
  playlist: SpotifyPlaylist;
  onBack: () => void;
  onAdd: (track: OptimisticTrack) => void;
}) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; needsReconnect: boolean } | null>(null);
  const [queueing, setQueueing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    console.info(`[playlists] loading tracks for ${playlist.id}`);
    getPlaylistTracks(playlist.id)
      .then((items) => {
        if (cancelled) return;
        console.info(`[playlists] got ${items.length} tracks`);
        setTracks(items);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = (e as Error).message ?? "Couldn't load tracks";
        console.warn("[playlists] tracks failed:", msg);
        setError({ message: msg, needsReconnect: isAuthLikeError(e) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playlist.id]);

  // Add every track in this playlist to the room queue, in order.
  // We space the emits out a touch so the server can append positions without
  // two concurrent queue:add handlers racing on (last?.position ?? 0) + 1.
  const queueAll = async () => {
    if (queueing || tracks.length === 0) return;
    setQueueing(true);
    try {
      for (const t of tracks) {
        onAdd(toOptimistic(t));
        await new Promise((r) => setTimeout(r, 90));
      }
    } finally {
      setQueueing(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] px-2 py-1 text-xs text-white/70 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="min-w-0 flex-1 truncate text-sm font-medium">
          {playlist.name}
        </div>
        {tracks.length > 0 && (
          <button
            onClick={queueAll}
            disabled={queueing}
            className="flex items-center gap-1 rounded-lg bg-brand-gradient text-ink-950 px-2.5 py-1 text-xs font-medium hover:brightness-110 transition-all disabled:opacity-60"
            title="Queue every track in this playlist"
          >
            {queueing && <Loader2 className="h-3 w-3 animate-spin" />}
            {queueing ? "Queueing…" : "Queue all"}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tracks…
        </div>
      )}

      {error && (
        <InlineError message={error.message} needsReconnect={error.needsReconnect} />
      )}

      {!loading && !error && tracks.length === 0 && (
        <div className="py-6 text-center text-xs text-white/50">
          This playlist is empty (or only contains podcasts).
        </div>
      )}

      {!loading && tracks.length > 0 && (
        <ul className="space-y-1 max-h-96 overflow-y-auto no-scrollbar">
          {tracks.map((t, i) => (
            <TrackRow
              key={`${t.uri}-${i}`}
              track={t}
              onAdd={() => onAdd(toOptimistic(t))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ===========================================================================
// Shared row + error
// ===========================================================================

function TrackRow({
  track,
  onAdd,
}: {
  track: SpotifyTrack;
  onAdd: () => void;
}) {
  // Defensive — same reasoning as PlaylistsView. Local/region-restricted
  // tracks can come back with empty artists or no album images.
  const images = Array.isArray(track.album?.images) ? track.album.images : [];
  const thumb = images[images.length - 1]?.url ?? images[0]?.url ?? null;
  const artistLine = Array.isArray(track.artists)
    ? track.artists.map((a) => a?.name).filter(Boolean).join(", ")
    : "";
  // The whole row is clickable now — users expect Spotify-style behaviour
  // where tapping anywhere on a track row queues it (and the room player
  // upgrades a tap on an empty queue into "play immediately"). The Plus
  // icon stays as an affordance but is decorative; the click target is the
  // entire row.
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors text-left group"
        title="Tap to queue (or play, if nothing's playing)"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-11 w-11 rounded object-cover"
          />
        ) : (
          <div className="grid h-11 w-11 place-items-center rounded bg-white/5">
            <Music className="h-4 w-4 text-white/40" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm truncate">{track.name ?? "Untitled track"}</div>
          <div className="text-xs text-white/50 truncate">{artistLine}</div>
        </div>
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-ink-950 opacity-80 group-hover:opacity-100 group-hover:brightness-110 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
    </li>
  );
}

function InlineError({
  message,
  needsReconnect = false,
}: {
  message: string;
  needsReconnect?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] px-3 py-2 text-xs text-rose-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span className="break-words flex-1">{message}</span>
      </div>
      {needsReconnect && (
        <div className="flex items-center gap-2 pl-5">
          <span className="text-rose-200/80">
            This usually means Spotify needs to be reconnected with updated
            permissions.
          </span>
          <button
            onClick={() => {
              // Pass the current room URL through so the OAuth round-trip
              // brings the user back here instead of dumping them on the
              // dashboard. Includes any query string (?invite= etc.).
              const returnTo =
                typeof window !== "undefined"
                  ? window.location.pathname + window.location.search
                  : undefined;
              void startSpotifyConnect(returnTo);
            }}
            className="rounded-md bg-rose-400/15 hover:bg-rose-400/25 border border-rose-400/30 px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap"
          >
            Reconnect Spotify
          </button>
        </div>
      )}
    </div>
  );
}

/** True for any Spotify response that suggests our OAuth scopes are stale. */
function isAuthLikeError(e: unknown): boolean {
  return (
    e instanceof SpotifyApiError && (e.status === 401 || e.status === 403)
  );
}
