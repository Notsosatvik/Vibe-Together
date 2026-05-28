"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Headphones, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AlbumArt } from "@/components/shared/album-art";
import { Avatar } from "@/components/ui/avatar";
import { Visualizer } from "@/components/shared/visualizer";
import { getTrack, getUser, type MockRoom } from "@/lib/mock-data";

export function RoomCard({ room, big = false }: { room: MockRoom; big?: boolean }) {
  const track = getTrack(room.trackId);
  const host = getUser(room.hostId);

  return (
    <Link href={`/rooms/${room.id}`} className="group block">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25 }}
      >
        <GlassCard className="relative h-full overflow-hidden">
          {/* Hero strip */}
          <div className="relative aspect-[16/8] overflow-hidden">
            <AlbumArt
              gradient={track.albumGradient}
              seed={track.id}
              className="absolute inset-0 scale-110 group-hover:scale-125 transition-transform duration-[1.2s]"
              rounded="rounded-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
                LIVE · {room.genre}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-2 py-1 text-[11px]">
                <Headphones className="h-3 w-3" />
                {room.listeners}
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-white/60">
                  Now Playing
                </div>
                <div className="text-base font-semibold leading-tight truncate max-w-[210px]">
                  {track.title}
                </div>
                <div className="text-xs text-white/65 truncate max-w-[210px]">
                  {track.artist}
                </div>
              </div>
              <Visualizer className="h-7 w-20" />
            </div>
          </div>

          {/* Body */}
          <div className="p-4 pt-3.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-semibold tracking-tight truncate">
                  {room.name}
                </div>
                <div className="text-xs text-white/50 truncate">{room.vibe}</div>
              </div>
              {big && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[10px]">
                  <Sparkles className="h-3 w-3 text-neon-green" />
                  Featured
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={host.name} color={host.avatarColor} size={24} />
                <span className="text-xs text-white/60">
                  Hosted by <span className="text-white">{host.name}</span>
                </span>
              </div>
              <div className="flex -space-x-1.5">
                {room.participants.slice(0, 4).map((id) => {
                  const u = getUser(id);
                  return (
                    <Avatar
                      key={id}
                      name={u.name}
                      color={u.avatarColor}
                      size={22}
                      ring
                    />
                  );
                })}
                {room.participants.length > 4 && (
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-white/10 border border-ink-900 text-[9px] font-medium">
                    +{room.participants.length - 4}
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </Link>
  );
}
