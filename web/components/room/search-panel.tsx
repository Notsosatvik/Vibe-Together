"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type SpotifyTrack = {
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: { url: string }[]; name: string };
};

type SearchResponse = {
  tracks?: { items: SpotifyTrack[] };
};

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
      try {
        const data = await apiFetch<SearchResponse>(
          `/spotify/search?q=${encodeURIComponent(q)}`
        );
        setResults(data.tracks?.items?.slice(0, 10) ?? []);
      } catch (e) {
        setError((e as { message?: string }).message ?? "Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Spotify…"
          className="w-full rounded-xl bg-white/[0.04] border border-white/8 pl-9 pr-3 h-10 text-sm outline-none focus:border-neon-green/60 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/40" />
        )}
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-300/80">{error}</div>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto no-scrollbar">
          {results.map((t) => (
            <li
              key={t.uri}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.05] transition-colors"
            >
              {t.album.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.album.images[t.album.images.length - 1]?.url ?? t.album.images[0].url}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
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
                className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-ink-950 hover:brightness-110 transition-all"
                title="Add to queue"
              >
                <Plus className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {q && !loading && results.length === 0 && !error && (
        <div className="mt-3 text-xs text-white/40 px-1">No results</div>
      )}
    </div>
  );
}
