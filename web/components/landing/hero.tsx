"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Headphones, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { BackgroundFX } from "@/components/shared/background-fx";
import { Visualizer } from "@/components/shared/visualizer";
import { AlbumArt } from "@/components/shared/album-art";
import { Avatar } from "@/components/ui/avatar";
import { mockTracks, mockUsers } from "@/lib/mock-data";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 md:pt-36 pb-24">
      <BackgroundFX />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs text-white/70"
            >
              <Sparkles className="h-3.5 w-3.5 text-neon-green" />
              <span>Now in private beta · Spotify-native</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="mt-6 font-display font-semibold tracking-tight text-[44px] sm:text-6xl lg:text-[72px] leading-[1.02]"
            >
              Listen Together.
              <br />
              <span className="text-gradient">Anywhere.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-6 max-w-xl text-lg text-white/65 leading-relaxed"
            >
              Real-time synchronized Spotify rooms for friends across the world.
              The same song, the same drop, the same goosebumps — millisecond-perfect.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/login">
                <Button size="lg" className="group">
                  <Play className="h-4 w-4 fill-current" />
                  Start a room — it's free
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="secondary" size="lg">
                  Watch the demo
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {mockUsers.slice(1, 6).map((u) => (
                  <Avatar
                    key={u.id}
                    name={u.name}
                    color={u.avatarColor}
                    size={32}
                    ring
                  />
                ))}
              </div>
              <div className="text-sm text-white/60">
                <span className="text-white font-medium">12,841</span> people listening together right now
              </div>
            </motion.div>
          </div>

          {/* Right: live mock room card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <HeroRoomCard />
            <FloatingTrackCards />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroRoomCard() {
  const track = mockTracks[0];
  return (
    <GlassCard className="relative p-5 sm:p-6 shadow-[0_40px_120px_-30px_rgba(168,85,247,0.45)]">
      {/* shine */}
      <div className="pointer-events-none absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" />
          </span>
          <span className="text-xs font-medium tracking-wide text-white/80 uppercase">
            Live · Late Night Lounge
          </span>
        </div>
        <div className="text-xs text-white/50">42 listening</div>
      </div>

      <div className="mt-5 flex gap-5">
        <AlbumArt
          gradient={track.albumGradient}
          seed={track.id}
          className="h-32 w-32 sm:h-36 sm:w-36 shrink-0 animate-spin-slow"
          rounded="rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-neon-green">
            Now Playing
          </div>
          <div className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {track.title}
          </div>
          <div className="truncate text-white/60">{track.artist}</div>

          <div className="mt-4">
            <Visualizer className="h-10" intense />
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-gradient"
                style={{ width: "37%" }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-white/50">
              <span>1:21</span>
              <span>3:38</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {mockUsers.slice(1, 5).map((u) => (
              <Avatar
                key={u.id}
                name={u.name}
                color={u.avatarColor}
                size={28}
                ring
                status="listening"
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Headphones className="h-3.5 w-3.5" />
            in sync · 4ms drift
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5 text-xs">
          <Users className="h-3 w-3" /> +6 friends
        </div>
      </div>
    </GlassCard>
  );
}

function FloatingTrackCards() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="absolute -left-6 sm:-left-10 -bottom-8 z-10"
      >
        <GlassCard className="flex items-center gap-3 px-3 py-2.5 pr-4 animate-float-slow">
          <AlbumArt
            gradient={mockTracks[1].albumGradient}
            seed={mockTracks[1].id}
            className="h-10 w-10"
            rounded="rounded-lg"
          />
          <div className="text-xs">
            <div className="font-semibold">{mockTracks[1].title}</div>
            <div className="text-white/50">{mockTracks[1].artist}</div>
          </div>
          <div className="ml-2 rounded-full bg-neon-green/15 px-2 py-0.5 text-[10px] font-medium text-neon-green">
            up next
          </div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.75 }}
        className="absolute -right-3 sm:-right-8 -top-6 z-10"
      >
        <GlassCard className="flex items-center gap-2.5 px-3 py-2 animate-float-slower">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-neon-purple/20 text-neon-purple">
            ✨
          </div>
          <div className="text-xs">
            <div className="font-semibold">Aria reacted</div>
            <div className="text-white/50">to the chorus</div>
          </div>
        </GlassCard>
      </motion.div>
    </>
  );
}
