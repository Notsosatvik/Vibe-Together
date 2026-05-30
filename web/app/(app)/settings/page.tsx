"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Music, Shield, LogOut, AlertTriangle, Loader2 } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/store/user";
import {
  diagnoseSpotify,
  logout,
  startSpotifyConnect,
  type SpotifyDiagnoseResult,
} from "@/lib/api";

const sections = [
  { id: "account", label: "Account", icon: Shield },
  { id: "spotify", label: "Spotify", icon: Music },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clear);
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("account");

  // Surface Spotify-callback errors via ?spotify=error&reason=... The API
  // redirects here (instead of dumping raw JSON on the API host) when the
  // OAuth callback fails — e.g. user not on the User Management allowlist,
  // /v1/me returned a non-JSON body, token exchange rejected, etc.
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("spotify");
    if (status === "error") {
      const reason =
        params.get("reason") ??
        "Couldn't connect Spotify. Try Reconnect again.";
      setSpotifyError(reason);
      setActive("spotify");
    } else if (status === "denied") {
      setSpotifyError(
        "Spotify connection was canceled. Click Connect Spotify to try again.",
      );
      setActive("spotify");
    }
    if (status) {
      const url = new URL(window.location.href);
      url.searchParams.delete("spotify");
      url.searchParams.delete("reason");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  if (!user) return null;

  const onLogout = async () => {
    await logout();
    clearUser();
    router.push("/login");
  };

  return (
    <>
      <TopBar title="Settings" subtitle="Fine-tune your VibeTogether" />
      <div className="px-6 lg:px-8 py-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm transition-all text-left",
                active === s.id
                  ? "bg-white/[0.06] text-white"
                  : "text-white/60 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
          <div className="pt-2">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-400/10 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </nav>

        <div className="space-y-4">
          {active === "account" && (
            <GlassCard className="p-6">
              <h3 className="font-display text-xl font-semibold tracking-tight">
                Account
              </h3>
              <p className="text-sm text-white/55 mt-1">Pulled from your Google account.</p>
              <div className="mt-6 grid gap-4 max-w-lg">
                <ReadOnlyField label="Display name" value={user.name} />
                <ReadOnlyField label="Handle" value={`@${user.handle}`} />
                <ReadOnlyField label="Email" value={user.email} />
              </div>
            </GlassCard>
          )}

          {active === "spotify" && (
            <GlassCard className="p-6">
              <h3 className="font-display text-xl font-semibold tracking-tight">
                Spotify
              </h3>
              <p className="text-sm text-white/55 mt-1">
                Manage your Spotify connection.
              </p>

              {spotifyError && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/[0.08] px-3.5 py-3 text-sm text-rose-100">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-rose-300" />
                  <div className="flex-1 leading-snug break-words">
                    {spotifyError}
                  </div>
                  <button
                    onClick={() => setSpotifyError(null)}
                    className="shrink-0 text-rose-200/60 hover:text-rose-100 text-xs"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}
              {user.spotifyId ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neon-green/30 bg-neon-green/[0.06] px-5 py-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-neon-green text-ink-950">
                    <Check className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      Connected{" "}
                      {user.spotifyProduct === "premium" ? (
                        <span className="text-neon-green">· Premium</span>
                      ) : (
                        <span className="text-white/60">· Free</span>
                      )}
                    </div>
                    <div className="text-sm text-white/60">
                      Linked to your account. Run a scope check below if you
                      hit permission errors.
                    </div>
                  </div>
                  <button
                    onClick={() => void startSpotifyConnect()}
                    className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-xs font-medium transition-colors"
                    title="Re-run the Spotify OAuth flow to get a fresh access token. Use this after changing your User Management list on the Spotify Developer Dashboard."
                  >
                    Reconnect
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  <div className="text-sm text-white/70">
                    You haven't connected Spotify yet. You need it to host rooms.
                  </div>
                  <Button onClick={() => void startSpotifyConnect()}>Connect Spotify</Button>
                </div>
              )}
              <div className="mt-4 text-xs text-white/40">
                VibeTogether only reads playback state and sends play/pause/seek
                commands to your device. We never modify your library or playlists.
              </div>

              {user.spotifyId && <SpotifyDiagnosePanel />}
            </GlassCard>
          )}
        </div>
      </div>
    </>
  );
}

// Diagnostic panel — hits /spotify/diagnose to show the exact scopes Spotify
// pinned to the user's refresh token. Use when 403s are happening and we need
// to know whether it's a scope problem or something else (region, account
// restriction, deprecated endpoint).
function SpotifyDiagnosePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpotifyDiagnoseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await diagnoseSpotify();
      setResult(r);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Failed to run diagnostic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Diagnose scopes</div>
          <div className="text-xs text-white/55 mt-0.5">
            Check what Spotify actually granted us. Run this if you're hitting
            403 errors after reconnecting.
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          className="rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {loading ? "Checking…" : "Run check"}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="break-words flex-1">{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-xs">
          {result.profile && (result.profile.email || result.profile.id) && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">
                Connected Spotify account
              </div>
              <div className="font-mono text-[11px] space-y-1">
                {result.profile.display_name && (
                  <div>
                    <span className="text-white/45">Name:</span>{" "}
                    <span className="text-white/90">
                      {result.profile.display_name}
                    </span>
                  </div>
                )}
                {result.profile.email && (
                  <div>
                    <span className="text-white/45">Email:</span>{" "}
                    <span className="text-amber-200">
                      {result.profile.email}
                    </span>
                  </div>
                )}
                {result.profile.id && (
                  <div>
                    <span className="text-white/45">Spotify ID:</span>{" "}
                    <span className="text-white/70">{result.profile.id}</span>
                  </div>
                )}
                {result.profile.country && (
                  <div>
                    <span className="text-white/45">Country:</span>{" "}
                    <span className="text-white/70">
                      {result.profile.country}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-[11px] text-white/55">
                In Dev Mode, this <span className="text-amber-200">email</span>{" "}
                must appear on the User Management list at{" "}
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white/80"
                >
                  developer.spotify.com/dashboard
                </a>
                .
              </div>
            </div>
          )}
          {result.missing.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-neon-green/30 bg-neon-green/[0.06] px-3 py-2 text-neon-green">
              <Check className="h-3.5 w-3.5" />
              <span>
                All {result.granted.length} requested scopes granted.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">
                  Missing {result.missing.length} scope
                  {result.missing.length === 1 ? "" : "s"}:
                </div>
                <div className="font-mono text-[11px] opacity-90 mt-1">
                  {result.missing.join(", ")}
                </div>
                <div className="mt-2 text-amber-200/80">
                  Revoke at{" "}
                  <a
                    href="https://www.spotify.com/account/apps/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    spotify.com/account/apps
                  </a>{" "}
                  and reconnect to fix.
                </div>
              </div>
            </div>
          )}
          <details className="text-white/55">
            <summary className="cursor-pointer hover:text-white/80 select-none">
              Full scope list
            </summary>
            <div className="mt-2 font-mono text-[11px] whitespace-pre-wrap break-all bg-white/[0.03] border border-white/10 rounded p-2">
              granted: {result.granted.join(" ") || "(none)"}
              {"\n\n"}
              requested: {result.requested.join(" ")}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
        {label}
      </div>
      <input
        value={value}
        readOnly
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none text-white/85"
      />
    </label>
  );
}
