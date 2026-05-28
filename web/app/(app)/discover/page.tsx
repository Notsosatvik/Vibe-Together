"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { RoomCard } from "@/components/app/room-card";
import { mockRooms } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tags = ["All", "For you", "Late Night", "Lo-fi", "Synthwave", "House", "Indie", "Workout", "Focus", "Throwback"];

export default function DiscoverPage() {
  const [active, setActive] = useState("All");

  return (
    <>
      <TopBar title="Discover" subtitle="The world is vibing. Pick your wave." />
      <div className="px-6 lg:px-8 py-6 space-y-8">
        {/* Tag rail */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 pb-1">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm whitespace-nowrap transition-all",
                  active === t
                    ? "bg-brand-gradient text-ink-950 shadow-glow"
                    : "glass hover:bg-white/10"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Spotlight */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 className="font-display text-xl font-semibold tracking-tight mb-3">
            Tonight's spotlight
          </h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockRooms.map((r, i) => (
              <RoomCard key={r.id} room={r} big={i === 0} />
            ))}
          </div>
        </motion.section>

        <section>
          <h3 className="font-display text-xl font-semibold tracking-tight mb-3">
            Curated rooms
          </h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...mockRooms].reverse().map((r) => (
              <RoomCard key={r.id + "-rev"} room={r} />
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <GlassCard className="p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight">
              Mood-based recommendations
            </h3>
            <p className="text-sm text-white/55 mt-1">
              AI reads the room and suggests rooms that match what you're feeling. Coming soon.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-purple" />
              In private beta
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight">
              Friends are listening
            </h3>
            <p className="text-sm text-white/55 mt-1">
              Tap any friend in the sidebar to instantly join their room with perfect sync.
            </p>
          </GlassCard>
        </section>
      </div>
    </>
  );
}
