"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Loader2, AlertTriangle, Music } from "lucide-react";
import {
  searchSpotifyTracks,
  type SpotifyTrack,
} from "@/lib/hooks/use-spotify-player";

export function SearchPanel({
  onAdd,
}: {
  onAdd: (trackUri: string) => void;
}) {
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
        // Direct browser → Spotify call. Bypasses our server proxy which was
        // intermittently 400-ing from Railway. Same token pattern as playback.
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
    <div className="rounded-2xl border border-neon-green/25 bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-ink-950">
          <Search className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Add the first track</div>
          <div className="text-[11px] text-white/50">
            Search any song on Spotify — it&apos;ll start playing in this tab
            as soon as you queue it.
          </div>
        </div>
      </div>

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
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-80 overflow-y-auto no-scrollbar">
          {results.map((t) => (
            <li
              key={t.uri}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05] transition-colors"
            >
              {t.album.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.album.images[t.album.images.length - 1]?.url ?? t.album.images[0].url}
                  alt=""
                  className="h-11 w-11 rounded object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded bg-white/5">
                  <Music className="h-4 w-4 text-white/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{t.name}</div>
                <div className="text-xs text-white/50 truncate">
                  {t.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
              <button
                onClick={() => {
                  onAdd(t.uri);
                  setQ("");
                  setResults([]);
                }}
                className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-ink-950 hover:brightness-110 transition-all"
                title="Add to queue"
              >
                <Plus className="h-4 w-4" />
              </button>
            </li>
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
