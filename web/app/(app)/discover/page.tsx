"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";

type ApiRoom = {
  id: string;
  name: string;
  genre: string | null;
  vibe: string | null;
  host: {
    name: string;
    handle: string;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
  _count: { participants: number };
};

export default function DiscoverPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<ApiRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ rooms: ApiRoom[] }>("/rooms")
      .then((r) => setRooms(r.rooms))
      .catch((e) => setError(e.message ?? "Couldn't load rooms"));
  }, []);

  // Build a unique list of genres present in real data
  const genres = Array.from(
    new Set((rooms ?? []).map((r) => r.genre).filter(Boolean))
  ) as string[];

  return (
    <>
      <TopBar title="Discover" subtitle="The world is vibing. Pick your wave." />
      <div className="px-6 lg:px-8 py-6 space-y-8">
        {/* Real genre rail (only shows genres that exist in current rooms) */}
        {genres.length > 0 && (
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 pb-1">
              {genres.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-4 py-2 text-sm whitespace-nowrap glass"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 className="font-display text-xl font-semibold tracking-tight mb-3">
            Live rooms
          </h3>

          {error && (
            <GlassCard className="p-5 text-sm text-rose-300">{error}</GlassCard>
          )}

          {!error && rooms === null && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <GlassCard key={i} className="h-44 animate-pulse opacity-60" />
              ))}
            </div>
          )}

          {!error && rooms !== null && rooms.length === 0 && (
            <GlassCard className="p-8 text-center">
              <Radio className="h-8 w-8 mx-auto text-neon-green/70" />
              <h4 className="mt-4 font-display text-xl">No rooms live right now</h4>
              <p className="mt-1 text-sm text-white/55 max-w-md mx-auto">
                The first room of the night could be yours. Head to Home and tap{" "}
                <span className="text-white">Create a Room</span>.
              </p>
            </GlassCard>
          )}

          {rooms && rooms.length > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rooms.map((r) => (
                <GlassCard key={r.id} className="overflow-hidden">
                  <div className="h-32 bg-brand-soft" />
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-neon-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
                      Live{r.genre ? ` · ${r.genre}` : ""}
                    </div>
                    <h4 className="mt-1 font-display text-lg font-semibold tracking-tight truncate">
                      {r.name}
                    </h4>
                    {r.vibe && (
                      <p className="text-xs text-white/55 truncate mt-0.5">{r.vibe}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar
                        name={r.host.name}
                        imageUrl={r.host.avatarUrl ?? undefined}
                        color={r.host.avatarColor ?? "from-neon-green to-neon-blue"}
                        size={24}
                      />
                      <div className="text-xs text-white/55 truncate">
                        {r.host.name} · {r._count.participants} listening
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/rooms/${r.id}`)}
                      >
                        Join <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </>
  );
}
