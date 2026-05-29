"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Music, Sparkles, Users, Headphones } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/store/user";
import { useMe } from "@/lib/hooks/use-me";
import { startSpotifyConnect } from "@/lib/api";

const steps = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "spotify", title: "Connect Spotify", icon: Music },
  { id: "vibes", title: "Pick your vibes", icon: Headphones },
] as const;

const moods = [
  "Late Night", "Deep Focus", "Sunset Drive", "Workout", "Pre-Game",
  "Coding", "Cozy Cafe", "Throwback", "House Party", "Indie Mornings",
  "Cinematic", "Slow Dance",
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Force a refresh of /users/me whenever we land on onboarding —
  // if the user just came back from Spotify OAuth, we need to pick up
  // the new spotifyId.
  const { user, status } = useMe();
  const loadMe = useUserStore((s) => s.loadMe);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // If the Spotify callback bounced them back here with ?spotify=connected,
  // force-refresh /users/me to pull the updated spotifyId.
  useEffect(() => {
    if (searchParams.get("spotify") === "connected") {
      useUserStore.setState({ status: "idle", user: null });
      void loadMe();
    }
  }, [searchParams, loadMe]);

  const spotifyConnected = !!user?.spotifyId;

  // If they connected and we still have an in-flight redirect param,
  // skip them right to "vibes" once we see it.
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (spotifyConnected && step === 1) setStep(2);
  }, [spotifyConnected, step]);

  const [picked, setPicked] = useState<string[]>([]);

  const totalSteps = steps.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const next = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else router.push("/dashboard");
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const togglePick = (m: string) =>
    setPicked((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const connectSpotify = () => startSpotifyConnect();

  return (
    <div className="w-full max-w-3xl">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-medium transition-all ${
                  i < step
                    ? "bg-neon-green text-ink-950"
                    : i === step
                    ? "bg-brand-gradient text-ink-950 shadow-glow"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden sm:block text-xs">
                <div className={i <= step ? "text-white" : "text-white/40"}>
                  {s.title}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 mx-2 h-px bg-white/10" />
              )}
            </div>
          ))}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full bg-brand-gradient"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <GlassCard strong className="p-8 sm:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  Hey {user?.name ? user.name.split(" ")[0] : "there"}.{" "}
                  <span className="text-gradient">Glad you're here.</span>
                </h1>
                <p className="mt-3 text-white/65">
                  We'll get you up and vibing in under a minute. Here's what to expect:
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    { icon: Music, text: "Connect Spotify so you can play full songs in rooms." },
                    { icon: Headphones, text: "Pick a few moods so we can recommend the right rooms." },
                    { icon: Users, text: "Invite friends with a room code — they'll listen in real time." },
                  ].map((row, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/8 px-4 py-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-ink-950">
                        <row.icon className="h-4 w-4" />
                      </div>
                      <span className="text-white/85">{row.text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  Connect Spotify
                </h1>
                <p className="mt-3 text-white/65">
                  We need this to control playback in your rooms. We never modify your
                  library and you can disconnect anytime.
                </p>

                <div className="mt-8">
                  {!spotifyConnected ? (
                    <button
                      onClick={connectSpotify}
                      className="flex items-center justify-center gap-3 rounded-full h-12 px-6 bg-[#1DB954] text-black font-semibold hover:brightness-110 transition-all"
                    >
                      <SpotifyIcon />
                      Connect Spotify
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-neon-green/30 bg-neon-green/[0.08] px-5 py-4">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-neon-green text-ink-950">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">Connected to Spotify</div>
                        <div className="text-sm text-white/60">
                          {user?.spotifyProduct === "premium"
                            ? "Spotify Premium · scopes granted"
                            : "Spotify connected · Premium required for full track playback"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-6 text-xs text-white/40">
                  Premium is required to play full tracks. Free accounts can still
                  chat, react, and follow along.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  What kind of room would you walk into{" "}
                  <span className="text-gradient">tonight?</span>
                </h1>
                <p className="mt-3 text-white/65">
                  Pick a few — we'll use these to surface rooms you'll love.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  {moods.map((m) => {
                    const active = picked.includes(m);
                    return (
                      <button
                        key={m}
                        onClick={() => togglePick(m)}
                        className={`rounded-full px-4 py-2 text-sm transition-all ${
                          active
                            ? "bg-brand-gradient text-ink-950 shadow-glow"
                            : "glass hover:bg-white/8"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 text-xs text-white/40">
                  {picked.length} selected · pick at least 3 for the best results.
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className={step === 0 ? "invisible" : ""}
          >
            Back
          </Button>
          <Button onClick={next} disabled={step === 1 && !spotifyConnected}>
            {step === totalSteps - 1 ? "Enter VibeTogether" : "Continue"}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.42a.62.62 0 0 1-.86.2c-2.36-1.44-5.33-1.77-8.83-.97a.62.62 0 1 1-.28-1.22c3.84-.88 7.15-.5 9.78 1.13.3.18.39.57.2.86zm1.24-2.77a.78.78 0 0 1-1.07.26c-2.7-1.66-6.83-2.14-10.04-1.17a.78.78 0 1 1-.46-1.5c3.66-1.12 8.19-.58 11.3 1.34.37.22.49.7.27 1.07zm.11-2.89C14.7 8.74 9.32 8.55 6.28 9.5a.94.94 0 1 1-.55-1.8c3.5-1.07 9.42-.86 13.06 1.32a.94.94 0 0 1-.96 1.6z" />
    </svg>
  );
}
