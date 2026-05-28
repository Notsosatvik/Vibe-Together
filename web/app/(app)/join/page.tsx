"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { RoomCard } from "@/components/app/room-card";
import { mockRooms } from "@/lib/mock-data";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = () => {
    if (!code.trim()) return;
    // In production: POST /api/rooms/join { code } -> { roomId }
    router.push(`/rooms/r_latenight`);
  };

  return (
    <>
      <TopBar title="Join or create a room" />
      <div className="px-6 lg:px-8 py-6 space-y-8">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Join with code */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard strong className="p-8">
              <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-white/70 mb-4">
                <Sparkles className="h-3 w-3 text-neon-green" />
                Got an invite code?
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                Drop in.
              </h3>
              <p className="text-white/55 mt-1 text-sm">
                Paste a room code or invite link. We'll sync you instantly.
              </p>

              <div className="mt-6 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  placeholder="e.g. VIBE-LATE-NIGHT"
                  className="flex-1 rounded-full bg-white/[0.04] border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-green/40 transition-colors font-mono uppercase tracking-wider"
                />
                <Button onClick={join} disabled={!code.trim()}>
                  Join <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-white/40">
                <span className="h-px flex-1 bg-white/8" />
                or
                <span className="h-px flex-1 bg-white/8" />
              </div>

              <div className="mt-6">
                <Link href="/rooms/new">
                  <Button variant="secondary" className="w-full">
                    Start a fresh room instead
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>

          {/* Create a room */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <GlassCard className="p-8 h-full">
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                Create a room
              </h3>
              <p className="text-white/55 mt-1 text-sm">
                Choose a name and vibe — invite friends in seconds.
              </p>

              <div className="mt-5 grid gap-3">
                <input
                  defaultValue="Late Night Lounge"
                  placeholder="Room name"
                  className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-green/40 transition-colors"
                />
                <div className="flex gap-2 text-xs">
                  {["Public", "Friends only", "Private link"].map((v, i) => (
                    <button
                      key={v}
                      className={`rounded-full px-3 py-1.5 transition-all ${
                        i === 0
                          ? "bg-brand-gradient text-ink-950"
                          : "bg-white/[0.04] border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Late Night", "Lo-fi", "House", "Indie", "Workout"].map((m, i) => (
                    <span
                      key={m}
                      className={`rounded-full px-3 py-1 text-xs ${
                        i === 0
                          ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                          : "bg-white/[0.04] text-white/60 border border-white/8"
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <Button className="mt-3">Start the room</Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Popular rooms */}
        <section>
          <h3 className="font-display text-xl font-semibold tracking-tight mb-3">
            Or hop into a live one
          </h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockRooms.slice(0, 3).map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
