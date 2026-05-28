"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar } from "@/components/ui/avatar";

const quotes = [
  {
    body: "Long-distance with my partner used to mean watching playlists drift. Now we just hit play in a room and forget the ocean is even there.",
    name: "Asha Iyer",
    role: "Listener · Brooklyn ⇄ Mumbai",
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    body: "We tested every \"watch party\" tool in the market for our weekly listening club. Nothing else stayed in sync past three minutes. VibeTogether is uncanny.",
    name: "Marcus Lee",
    role: "Founder, Saturate FM",
    color: "from-sky-400 to-indigo-600",
  },
  {
    body: "Throwing a release party in a VibeTogether room felt closer to a real club than any Zoom event we've ever done. The reactions popping over the player are everything.",
    name: "Nova Adeyemi",
    role: "Independent Artist",
    color: "from-emerald-400 to-teal-600",
  },
  {
    body: "Onboarding was 9 seconds: sign in, hit Spotify, share a code. My band was vibing from four time zones before the kettle boiled.",
    name: "Rin Sato",
    role: "Drummer, Hour Glass",
    color: "from-amber-400 to-rose-500",
  },
  {
    body: "I run a global community of 4,000 listeners. Hosting sessions used to take a producer. Now it takes a link.",
    name: "Theo Vance",
    role: "Community Lead, Audiocore",
    color: "from-rose-400 to-orange-500",
  },
  {
    body: "Music is meant to be felt with people. VibeTogether finally feels like it was built by people who actually love music, not just by people who love metrics.",
    name: "Camille Roy",
    role: "Music Critic",
    color: "from-cyan-400 to-blue-600",
  },
];

const logos = [
  "Saturate FM",
  "Hour Glass",
  "Audiocore",
  "Cassette Sun",
  "Polaris Youth",
  "Aerodive",
  "Lumen Wave",
  "The Forecasts",
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-28">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-purple" />
            Loved by listeners
          </div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            People keep saying the same <span className="text-gradient">two words</span>.
          </h2>
          <p className="mt-4 text-white/60 text-lg">
            <em>Holy. Goosebumps.</em>
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <GlassCard className="h-full p-6">
                <p className="text-[15px] leading-relaxed text-white/80">
                  &ldquo;{q.body}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar name={q.name} color={q.color} size={36} />
                  <div>
                    <div className="text-sm font-semibold">{q.name}</div>
                    <div className="text-xs text-white/50">{q.role}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Marquee logos */}
        <div className="mt-16 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <div className="marquee-track">
            {[...logos, ...logos].map((l, i) => (
              <span
                key={i}
                className="mx-10 text-white/30 hover:text-white/60 transition-colors font-display font-semibold tracking-wide text-xl"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
