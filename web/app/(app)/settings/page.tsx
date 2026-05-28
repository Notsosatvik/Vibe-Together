"use client";

import { useState } from "react";
import { Check, Music, Bell, Shield, Palette, LogOut } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  { id: "account", label: "Account", icon: Shield },
  { id: "spotify", label: "Spotify", icon: Music },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

export default function SettingsPage() {
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("account");

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
            <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-400/10 transition-all">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </nav>

        <div className="space-y-4">
          {active === "account" && <AccountSection />}
          {active === "spotify" && <SpotifySection />}
          {active === "appearance" && <AppearanceSection />}
          {active === "notifications" && <NotificationsSection />}
        </div>
      </div>
    </>
  );
}

function AccountSection() {
  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-xl font-semibold tracking-tight">Account</h3>
      <p className="text-sm text-white/55 mt-1">Your basics.</p>
      <div className="mt-6 grid gap-4 max-w-lg">
        <Field label="Display name" value="Sonali B" />
        <Field label="Handle" value="@sonali" />
        <Field label="Email" value="sonali@example.com" />
        <Field label="Time zone" value="America/Los_Angeles" />
      </div>
      <div className="mt-6 flex gap-2">
        <Button>Save changes</Button>
        <Button variant="ghost">Cancel</Button>
      </div>
    </GlassCard>
  );
}

function SpotifySection() {
  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-xl font-semibold tracking-tight">Spotify</h3>
      <p className="text-sm text-white/55 mt-1">Manage your Spotify connection.</p>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neon-green/30 bg-neon-green/[0.06] px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-neon-green text-ink-950">
          <Check className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Connected as <span className="text-neon-green">sonali_b</span></div>
          <div className="text-sm text-white/60">Spotify Premium · all scopes granted</div>
        </div>
        <Button variant="outline" size="sm">Disconnect</Button>
      </div>
      <div className="mt-4 text-xs text-white/40">
        VibeTogether only reads playback state and sends play/pause/seek commands to your device.
        We never modify your library or playlists.
      </div>
    </GlassCard>
  );
}

function AppearanceSection() {
  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-xl font-semibold tracking-tight">Appearance</h3>
      <p className="text-sm text-white/55 mt-1">Make it yours.</p>
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        {["Nebula", "Aurora", "Sunset"].map((theme, i) => (
          <button
            key={theme}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              i === 0
                ? "border-neon-green/40 bg-neon-green/[0.06]"
                : "border-white/8 bg-white/[0.025] hover:bg-white/[0.04]"
            )}
          >
            <div
              className="h-16 rounded-xl"
              style={{
                background:
                  i === 0
                    ? "linear-gradient(135deg, #1DF5A4, #3B82F6, #A855F7)"
                    : i === 1
                    ? "linear-gradient(135deg, #06B6D4, #6366F1, #F472B6)"
                    : "linear-gradient(135deg, #F59E0B, #EC4899, #6366F1)",
              }}
            />
            <div className="mt-3 text-sm font-medium flex items-center justify-between">
              {theme} {i === 0 && <Check className="h-4 w-4 text-neon-green" />}
            </div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

function NotificationsSection() {
  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-xl font-semibold tracking-tight">Notifications</h3>
      <p className="text-sm text-white/55 mt-1">When should we tap you on the shoulder?</p>
      <div className="mt-6 space-y-2 max-w-lg">
        {[
          ["Friend joins a room", true],
          ["Someone DMs you", true],
          ["Your room hits 50 listeners", true],
          ["Weekly listening recap", false],
          ["New badges earned", true],
        ].map(([label, on]) => (
          <label
            key={label as string}
            className="flex items-center justify-between rounded-xl bg-white/[0.025] border border-white/8 px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-all"
          >
            <span className="text-sm">{label}</span>
            <Toggle defaultOn={on as boolean} />
          </label>
        ))}
      </div>
    </GlassCard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
        {label}
      </div>
      <input
        defaultValue={value}
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-neon-green/40 transition-colors"
      />
    </label>
  );
}

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={cn(
        "relative h-6 w-10 rounded-full transition-all",
        on ? "bg-brand-gradient shadow-glow" : "bg-white/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          on && "translate-x-4"
        )}
      />
    </button>
  );
}
