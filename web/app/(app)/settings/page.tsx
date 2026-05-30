"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Music, Shield, LogOut } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/store/user";
import { logout, startSpotifyConnect } from "@/lib/api";

const sections = [
  { id: "account", label: "Account", icon: Shield },
  { id: "spotify", label: "Spotify", icon: Music },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clear);
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("account");

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
                      All required scopes granted.
                    </div>
                  </div>
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
            </GlassCard>
          )}
        </div>
      </div>
    </>
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
