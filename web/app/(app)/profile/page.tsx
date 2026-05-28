"use client";

import { motion } from "framer-motion";
import { Award, Headphones, Flame, Music, TrendingUp, Calendar } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlbumArt } from "@/components/shared/album-art";
import { mockTracks, mockRooms } from "@/lib/mock-data";

const badges = [
  { icon: Flame, label: "30-day streak", color: "from-orange-400 to-rose-500" },
  { icon: Award, label: "Top host", color: "from-amber-400 to-yellow-500" },
  { icon: Music, label: "1k tracks queued", color: "from-fuchsia-500 to-purple-600" },
  { icon: Headphones, label: "100h listened", color: "from-emerald-400 to-teal-500" },
  { icon: TrendingUp, label: "Curator", color: "from-sky-400 to-indigo-600" },
];

export default function ProfilePage() {
  return (
    <>
      <TopBar title="Your profile" subtitle="Your sound, your story." />
      <div className="px-6 lg:px-8 py-6 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard strong className="relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-soft opacity-50" />
            <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Avatar
                name="Sonali B"
                color="from-neon-green to-neon-blue"
                size={96}
                ring
                status="listening"
              />
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wider text-neon-green">
                  Vibe Curator · Level 7
                </div>
                <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  Sonali B
                </h1>
                <p className="text-white/55 mt-1">
                  @sonali · 142 friends · joined March 2026
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Stat label="Hours listened" value="324" />
                  <Stat label="Rooms hosted" value="38" />
                  <Stat label="Streak" value="14 days" accent />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary">Share profile</Button>
                <Button>Edit</Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Badges */}
        <section>
          <h3 className="font-display text-xl font-semibold tracking-tight mb-3">
            Badges
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {badges.map((b) => (
              <GlassCard
                key={b.label}
                className="p-4 text-center transition-all hover:-translate-y-1"
              >
                <div
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${b.color} shadow-glow`}
                >
                  <b.icon className="h-5 w-5 text-ink-950" />
                </div>
                <div className="mt-3 text-sm font-medium">{b.label}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                  Earned
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Top tracks + rooms */}
        <section className="grid lg:grid-cols-2 gap-4">
          <GlassCard className="p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight mb-3 flex items-center gap-2">
              <Music className="h-4 w-4 text-neon-green" /> Top tracks · this month
            </h3>
            <ul className="space-y-2">
              {mockTracks.slice(0, 5).map((t, i) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03] transition-all"
                >
                  <span className="w-5 text-center text-[11px] text-white/40 font-mono">
                    {i + 1}
                  </span>
                  <AlbumArt
                    gradient={t.albumGradient}
                    seed={t.id}
                    className="h-11 w-11"
                    rounded="rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-[11px] text-white/45 truncate">{t.artist}</div>
                  </div>
                  <div className="text-[11px] font-mono text-white/45">
                    {Math.floor(28 - i * 4)} plays
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neon-blue" /> Recent rooms
            </h3>
            <ul className="space-y-2">
              {mockRooms.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03] transition-all"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-neon-purple/40 to-neon-blue/40 text-sm">
                    {r.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[11px] text-white/45">
                      {r.listeners} listening · {r.genre}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">Join</Button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className={`text-base font-semibold ${accent ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}
