"use client";

import { motion } from "framer-motion";
import {
  Radio,
  Users,
  Sparkles,
  ListMusic,
  Mic2,
  Globe2,
  Shield,
  Zap,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

const features = [
  {
    icon: Radio,
    title: "Millisecond-perfect sync",
    body: "Our drift-correcting clock keeps every listener inside a 30ms window — even on shaky Wi-Fi.",
    accent: "from-neon-green/30 to-transparent",
  },
  {
    icon: Users,
    title: "Rooms for any vibe",
    body: "Public lounges, private after-hours rooms, or invite-only listening parties — your call.",
    accent: "from-neon-purple/30 to-transparent",
  },
  {
    icon: ListMusic,
    title: "Collaborative queue",
    body: "Everyone can add. The host approves. Vote-skip when the energy's off.",
    accent: "from-neon-blue/30 to-transparent",
  },
  {
    icon: Mic2,
    title: "Reactions & live chat",
    body: "Drop ✨🔥💀 in real-time. Synced reactions burst over the player like fireworks.",
    accent: "from-pink-500/30 to-transparent",
  },
  {
    icon: Sparkles,
    title: "AI mood mixing",
    body: "VibeTogether reads the room and suggests tracks that match the energy — not just the genre.",
    accent: "from-amber-400/30 to-transparent",
  },
  {
    icon: Globe2,
    title: "Across any distance",
    body: "Tokyo, Lagos, São Paulo, Berlin — same chorus, same second, same goosebumps.",
    accent: "from-cyan-400/30 to-transparent",
  },
  {
    icon: Zap,
    title: "Spotify-native",
    body: "Bring your library, playlists, and premium quality. Nothing to install beyond your browser.",
    accent: "from-emerald-400/30 to-transparent",
  },
  {
    icon: Shield,
    title: "Privacy-first",
    body: "End-to-end encrypted DMs, granular room privacy, no shady data brokering. Ever.",
    accent: "from-indigo-400/30 to-transparent",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
            Features
          </div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Built for the way music actually <span className="text-gradient">makes you feel</span>.
          </h2>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            Every detail engineered so you can stop thinking about the tech and start
            feeling the song — with the people who get it.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
            >
              <GlassCard className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-white/55 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
