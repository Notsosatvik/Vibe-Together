"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Visualizer } from "@/components/shared/visualizer";
import { AlbumArt } from "@/components/shared/album-art";
import { mockTracks } from "@/lib/mock-data";

export default function LoginPage() {
  const router = useRouter();

  // In production: window.location.href = `${API_URL}/auth/google?redirect=/onboarding`
  const startGoogle = () => router.push("/onboarding");

  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-2 items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="order-2 lg:order-1"
      >
        <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
          Welcome back
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
          Press play
          <br />
          <span className="text-gradient">together.</span>
        </h1>
        <p className="mt-4 max-w-md text-white/60 leading-relaxed">
          Sign in with your Google account to start a room or join your friends.
          You'll connect Spotify in the next step.
        </p>

        <div className="mt-8 max-w-md space-y-3">
          <button
            onClick={startGoogle}
            className="group flex w-full items-center justify-center gap-3 rounded-full bg-white text-ink-950 h-12 px-5 font-medium transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            disabled
            title="Coming soon"
            className="flex w-full items-center justify-center gap-3 rounded-full glass h-12 px-5 font-medium text-white/60 disabled:cursor-not-allowed"
          >
            <AppleIcon />
            Continue with Apple <span className="text-xs text-white/30">· soon</span>
          </button>
        </div>

        <p className="mt-6 text-xs text-white/40 max-w-md">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-white/70">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-white/70">Privacy Policy</Link>.
          You can disconnect Spotify at any time from Settings.
        </p>
      </motion.div>

      {/* Right: aesthetic card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="order-1 lg:order-2"
      >
        <GlassCard strong className="relative overflow-hidden p-6">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-green/20 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-xs uppercase tracking-wider text-white/70">
              Right now · 12,841 listening
            </span>
          </div>

          <div className="relative mt-6 flex items-center gap-4">
            <AlbumArt
              gradient={mockTracks[0].albumGradient}
              seed={mockTracks[0].id}
              className="h-20 w-20 animate-spin-slow"
              rounded="rounded-full"
            />
            <div>
              <div className="text-xs uppercase tracking-wider text-neon-green">
                Late Night Lounge
              </div>
              <div className="text-xl font-semibold leading-tight mt-0.5">
                {mockTracks[0].title}
              </div>
              <div className="text-sm text-white/60">{mockTracks[0].artist}</div>
            </div>
          </div>

          <div className="relative mt-6">
            <Visualizer className="h-12" intense />
          </div>

          <div className="relative mt-6 flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/8 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-neon-green font-mono">4ms</span>
              <span>avg drift</span>
            </div>
            <div className="text-white/40">·</div>
            <div className="text-white/70">
              <span className="text-white">42</span> in sync
            </div>
            <div className="text-white/40">·</div>
            <div className="text-white/70">
              <span className="text-white">5</span> continents
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.2 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.1 4 9.3 8.5 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.1 0-9.5-3.3-11.1-7.9l-6.5 5C9.2 39.5 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.7 35.5 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.41 2.12-1.22 2.94-.84.85-1.85 1.34-2.95 1.25-.07-1.1.34-2.13 1.16-2.93.81-.83 1.91-1.34 3.01-1.26zM20.61 17.16c-.6 1.36-.88 1.97-1.66 3.18-1.08 1.68-2.61 3.78-4.5 3.79-1.68.02-2.12-1.1-4.4-1.08-2.28.01-2.76 1.1-4.44 1.08-1.9-.01-3.34-1.91-4.43-3.59C-1.34 16 .04 9.92 4.18 8.6c1.84-.59 3.6.27 4.94.27 1.32 0 3.5-.99 5.55-.84.86.04 3.28.35 4.83 2.62-.13.08-2.89 1.69-2.85 5.05.05 4 3.49 5.33 3.96 5.46z"/>
    </svg>
  );
}
