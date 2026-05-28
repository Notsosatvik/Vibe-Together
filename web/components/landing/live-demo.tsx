"use client";

import { motion } from "framer-motion";
import { Heart, Headphones, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AlbumArt } from "@/components/shared/album-art";
import { Avatar } from "@/components/ui/avatar";
import { Visualizer } from "@/components/shared/visualizer";
import { mockTracks, mockUsers } from "@/lib/mock-data";

const locations = [
  { user: 1, city: "Tokyo", drift: "3ms", lat: "32%", lng: "82%" },
  { user: 2, city: "Berlin", drift: "8ms", lat: "26%", lng: "50%" },
  { user: 4, city: "Lagos", drift: "12ms", lat: "55%", lng: "52%" },
  { user: 5, city: "Mexico City", drift: "5ms", lat: "48%", lng: "22%" },
  { user: 7, city: "São Paulo", drift: "10ms", lat: "70%", lng: "32%" },
];

export function LiveDemo() {
  const track = mockTracks[2];

  return (
    <section id="demo" className="relative py-28">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-blue" />
            Live demo
          </div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            One song. <span className="text-gradient">Five continents.</span>
          </h2>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            Watch a real listening room sync across the world. Every dot is a person
            hearing the exact same beat as you, right now.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="mt-14"
        >
          <GlassCard strong className="overflow-hidden">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              {/* Map panel */}
              <div className="relative aspect-[16/10] lg:aspect-auto min-h-[420px] overflow-hidden border-b lg:border-b-0 lg:border-r border-white/8">
                <WorldMapDots />
                {locations.map((loc) => (
                  <div
                    key={loc.city}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ top: loc.lat, left: loc.lng }}
                  >
                    <div className="relative">
                      <span className="absolute inset-0 -m-2 rounded-full bg-neon-green/20 blur-md animate-ping" />
                      <Avatar
                        name={mockUsers[loc.user].name}
                        color={mockUsers[loc.user].avatarColor}
                        size={32}
                        ring
                      />
                    </div>
                    <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900/90 px-2 py-0.5 text-[10px] text-white/80 border border-white/10">
                      {loc.city} · {loc.drift}
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div className="rounded-2xl glass-strong p-3 pr-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
                      Avg drift across 5 cities
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold">
                      7.6<span className="text-white/40 text-base"> ms</span>
                    </div>
                  </div>
                  <Visualizer className="h-12 w-44" intense />
                </div>
              </div>

              {/* Side panel */}
              <div className="relative p-6">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Live now
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <AlbumArt
                    gradient={track.albumGradient}
                    seed={track.id}
                    className="h-16 w-16"
                    rounded="rounded-xl"
                  />
                  <div>
                    <div className="text-lg font-semibold leading-tight">
                      {track.title}
                    </div>
                    <div className="text-white/50 text-sm">{track.artist}</div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { user: 1, text: "this drop got the whole map screaming" },
                    { user: 4, text: "Lagos checking in 🇳🇬", reaction: "🔥" },
                    { user: 5, text: "🎧 hits different in stereo", reaction: "✨" },
                  ].map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15 }}
                      className="flex items-start gap-2.5"
                    >
                      <Avatar
                        name={mockUsers[m.user].name}
                        color={mockUsers[m.user].avatarColor}
                        size={26}
                      />
                      <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/8 px-3 py-1.5 text-sm">
                        {m.text}
                        {m.reaction && (
                          <span className="ml-1.5">{m.reaction}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  <Stat icon={Headphones} label="Listening" value="3,214" />
                  <Stat icon={Heart} label="Reactions" value="11.2K" />
                  <Stat icon={MessageCircle} label="Messages" value="582" />
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] py-3">
      <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function WorldMapDots() {
  // dotted "map" — purely decorative grid of dots clipped to a soft ellipse
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 1000 600" className="absolute inset-0 h-full w-full opacity-40">
        <defs>
          <radialGradient id="fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </radialGradient>
          <mask id="m">
            <rect width="1000" height="600" fill="url(#fade)" />
          </mask>
          <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="white" />
          </pattern>
        </defs>
        <rect width="1000" height="600" fill="url(#dots)" mask="url(#m)" />
      </svg>
      {/* connection lines */}
      <svg viewBox="0 0 1000 600" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="line" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#1DF5A4" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {[
          ["220,156", "500,132", "820,192"],
          ["480,288", "700,420"],
        ].map((path, i) => (
          <polyline
            key={i}
            points={path.join(" ")}
            fill="none"
            stroke="url(#line)"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
        ))}
      </svg>
    </div>
  );
}
