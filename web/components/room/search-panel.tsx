"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  getPlaylistTracks,
  type SpotifyTrack,
  type SpotifyPlaylist,
} from "@/lib/hooks/use-spotify-player";

type Tab = "search" | "playlists";

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
  onAdd: (trackUri: string) => void;
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

      {tab === "search" ? (
        <SearchView onAdd={onAdd} />
      ) : (
        <PlaylistsView onAdd={onAdd} />
      )}
    </div>
  );
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

function SearchView({ onAdd }: { onAdd: (trackUri: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setError(msg);
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

      {error && <InlineError message={error} />}

      {results.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-80 overflow-y-auto no-scrollbar">
          {results.map((t) => (
            <TrackRow
              key={t.uri}
              track={t}
              onAdd={() => {
                onAdd(t.uri);
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

function PlaylistsView({ onAdd }: { onAdd: (trackUri: string) => void }) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setError(msg);
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

  if (error) return <InlineError message={error} />;

  if (playlists.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-white/50">
        No playlists found in your Spotify account.
      </div>
    );
  }

  return (
    <ul className="space-y-1 max-h-96 overflow-y-auto no-scrollbar">
      {playlists.map((p) => (
        <li key={p.id}>
          <button
            onClick={() => setSelected(p)}
            className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05] transition-colors text-left"
          >
            {p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.images[p.images.length - 1]?.url ?? p.images[0].url}
                alt=""
                className="h-11 w-11 rounded object-cover"
              />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded bg-white/5">
                <ListMusic className="h-4 w-4 text-white/40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{p.name}</div>
              <div className="text-xs text-white/50 truncate">
                {p.tracks.total} track{p.tracks.total === 1 ? "" : "s"}
                {p.owner.display_name ? ` · ${p.owner.display_name}` : ""}
              </div>
            </div>
          </button>
        </li>
      ))}
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
  onAdd: (trackUri: string) => void;
}) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setError(msg);
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
        onAdd(t.uri);
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

      {error && <InlineError message={error} />}

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
              onAdd={() => onAdd(t.uri)}
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
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05] transition-colors">
      {track.album.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={
            track.album.images[track.album.images.length - 1]?.url ??
            track.album.images[0].url
          }
          alt=""
          className="h-11 w-11 rounded object-cover"
        />
      ) : (
        <div className="grid h-11 w-11 place-items-center rounded bg-white/5">
          <Music className="h-4 w-4 text-white/40" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{track.name}</div>
        <div className="text-xs text-white/50 truncate">
          {track.artists.map((a) => a.name).join(", ")}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-ink-950 hover:brightness-110 transition-all"
        title="Add to queue"
      >
        <Plus className="h-4 w-4" />
      </button>
    </li>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] px-3 py-2 text-xs text-rose-200">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span className="break-words">{message}</span>
    </div>
  );
}
