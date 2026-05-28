"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, UserPlus, Search } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar } from "@/components/ui/avatar";
import { Visualizer } from "@/components/shared/visualizer";
import { Button } from "@/components/ui/button";
import { mockUsers } from "@/lib/mock-data";

export default function FriendsPage() {
  const listening = mockUsers.filter((u) => u.status === "listening" && u.id !== "u_self");
  const idle = mockUsers.filter((u) => u.status === "idle");
  const offline = mockUsers.filter((u) => u.status === "offline");

  return (
    <>
      <TopBar title="Friends" subtitle="See what your people are listening to right now" />

      <div className="px-6 lg:px-8 py-6 space-y-8">
        {/* Add friend */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-full glass px-4 py-2.5">
            <Search className="h-4 w-4 text-white/40" />
            <input
              placeholder="Add by @handle or email…"
              className="flex-1 bg-transparent text-sm placeholder:text-white/35 outline-none"
            />
          </div>
          <Button>
            <UserPlus className="h-4 w-4" />
            Add friend
          </Button>
        </div>

        {/* Listening now */}
        <section>
          <SectionTitle title="Listening now" count={listening.length} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listening.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={u.name}
                      color={u.avatarColor}
                      size={48}
                      status="listening"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{u.name}</div>
                      <div className="text-xs text-white/50 truncate">@{u.handle}</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-neon-green">
                        Playing
                      </div>
                      <div className="text-sm font-medium truncate">
                        {u.currentlyPlaying ?? "Lounge mix"}
                      </div>
                    </div>
                    <Visualizer bars={14} className="h-7 w-20 shrink-0" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href="/rooms/r_latenight" className="flex-1">
                      <Button size="sm" className="w-full">Listen along</Button>
                    </Link>
                    <Button size="sm" variant="secondary">DM</Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="Online · Idle" count={idle.length} />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {idle.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl glass px-3 py-2.5"
              >
                <Avatar name={u.name} color={u.avatarColor} size={36} status="idle" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-white/45 truncate">@{u.handle} · idle</div>
                </div>
                <button className="text-xs text-neon-green">Nudge</button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionTitle title="Offline" count={offline.length} />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-70">
            {offline.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl glass px-3 py-2.5"
              >
                <Avatar name={u.name} color={u.avatarColor} size={36} status="offline" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-white/40 truncate">@{u.handle}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-display text-xl font-semibold tracking-tight">
        {title} <span className="text-white/40 text-sm font-normal">{count}</span>
      </h3>
      <Users className="h-4 w-4 text-white/40" />
    </div>
  );
}
