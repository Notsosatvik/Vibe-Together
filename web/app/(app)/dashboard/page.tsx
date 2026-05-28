"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles, Clock, Flame } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AlbumArt } from "@/components/shared/album-art";
import { Visualizer } from "@/components/shared/visualizer";
import { RoomCard } from "@/components/app/room-card";
import { mockRooms, mockUsers, mockTracks, getUser, getTrack } from "@/lib/mock-data";

export default function DashboardPage() {
  const featured = mockRooms[0];

  return (
    <>
      <TopBar title="Good evening, Sonali" subtitle="Pick a room or start your own." />

      <div className="px-6 lg:px-8 py-6 space-y-10">
        {/* Hero panel */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Featured Room */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard strong className="relative overflow-hidden h-full">
              <div className="grid sm:grid-cols-[1fr_1.1fr] h-full">
                <div className="relative aspect-square sm:aspect-auto overflow-hidden">
                  <AlbumArt
                    gradient={getTrack(featured.trackId).albumGradient}
                    seed={featured.trackId}
                    className="absolute inset-0"
                    rounded="rounded-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-ink-900" />
                </div>
                <div className="p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/80 mb-4">
                      <Flame className="h-3 w-3 text-neon-green" />
                      Trending tonight
                    </div>
                    <h2 className="font-display text-3xl font-semibold tracking-tight">
                      {featured.name}
                    </h2>
                    <p className="mt-1 text-white/55">{featured.vibe}</p>

                    <div className="mt-5 flex items-center gap-3">
                      <Avatar
                        name={getUser(featured.hostId).name}
                        color={getUser(featured.hostId).avatarColor}
                        size={32}
                      />
                      <div>
                        <div className="text-sm">
                          Hosted by <span className="font-medium">{getUser(featured.hostId).name}</span>
                        </div>
                        <div className="text-xs text-white/45">
                          {featured.listeners} listening · {featured.genre}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Visualizer className="h-9" intense />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Link href={`/rooms/${featured.id}`}>
                      <Button>
                        Join the room
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="secondary">
                      <Plus className="h-4 w-4" />
                      New Room
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Stats / quick action */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <StatCard
              icon={Clock}
              label="Listening streak"
              value="14 days"
              hint="Longest yet"
            />
            <StatCard
              icon={Sparkles}
              label="Top mood this week"
              value="Late Night"
              hint="68% of your listens"
            />
            <StatCard
              icon={Flame}
              label="With friends"
              value="9h 24m"
              hint="+2h vs last week"
              accent
            />
          </div>
        </section>

        {/* Live rooms */}
        <section>
          <SectionHeader title="Live rooms" subtitle="Rooms vibing right now" href="/discover" />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockRooms.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
              >
                <RoomCard room={r} big={i === 0} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Friends activity */}
        <section className="grid lg:grid-cols-2 gap-4">
          <GlassCard className="p-6">
            <SectionHeader
              title="Friends activity"
              subtitle="Real-time"
              compact
              href="/friends"
            />
            <ul className="mt-3 space-y-2.5">
              {mockUsers
                .filter((u) => u.status === "listening" && u.id !== "u_self")
                .slice(0, 5)
                .map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.025] border border-white/8 px-3 py-2.5"
                  >
                    <Avatar
                      name={u.name}
                      color={u.avatarColor}
                      size={36}
                      status="listening"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-white/50"> is listening to </span>
                        <span className="text-white font-medium">
                          {u.currentlyPlaying ?? "a room"}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">just now</div>
                    </div>
                    <Visualizer bars={12} className="h-8 w-16" />
                  </li>
                ))}
            </ul>
          </GlassCard>

          {/* Recent tracks */}
          <GlassCard className="p-6">
            <SectionHeader
              title="Recently played"
              subtitle="From your rooms"
              compact
              href="/profile"
            />
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {mockTracks.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03] transition-all"
                >
                  <AlbumArt
                    gradient={t.albumGradient}
                    seed={t.id}
                    className="h-10 w-10"
                    rounded="rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-[11px] text-white/45 truncate">
                      {t.artist}
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-neon-green">
                    Add to queue
                  </button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>

        {/* Discover teaser */}
        <section>
          <SectionHeader
            title="Recommended for you"
            subtitle="Tuned to your week"
            href="/discover"
          />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockRooms.slice(1, 4).map((r) => (
              <RoomCard key={r.id + "-rec"} room={r} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between ${compact ? "mb-1" : "mb-5"}`}>
      <div>
        <h3 className={`font-display ${compact ? "text-lg" : "text-2xl"} font-semibold tracking-tight`}>
          {title}
        </h3>
        {subtitle && <div className="text-xs text-white/45 mt-0.5">{subtitle}</div>}
      </div>
      {href && (
        <Link href={href} className="text-sm text-neon-green hover:underline">
          See all
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <GlassCard
      className={`p-5 ${accent ? "ring-1 ring-neon-green/30 shadow-glow" : ""}`}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/45">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-2 font-display text-3xl font-semibold tracking-tight ${accent ? "text-gradient" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-white/50 mt-1">{hint}</div>
    </GlassCard>
  );
}
