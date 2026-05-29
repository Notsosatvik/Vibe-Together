"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles, Music2, Flame, Radio } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Visualizer } from "@/components/shared/visualizer";
import { useUserStore } from "@/lib/store/user";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Real backend types — mirror what /rooms returns from the API.
// ---------------------------------------------------------------------------

type ApiHost = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string | null;
};

type ApiRoom = {
  id: string;
  name: string;
  privacy: "PUBLIC" | "FRIENDS" | "PRIVATE";
  genre: string | null;
  vibe: string | null;
  code: string;
  hostId: string;
  host: ApiHost;
  createdAt: string;
  _count: { participants: number };
};

export default function DashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useUserStore((s) => s.user);

  const [rooms, setRooms] = useState<ApiRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const justConnectedSpotify = params.get("spotify") === "connected";

  const loadRooms = useCallback(async () => {
    try {
      const data = await apiFetch<{ rooms: ApiRoom[] }>("/rooms");
      setRooms(data.rooms);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Couldn't load rooms");
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const createRoom = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { room } = await apiFetch<{ room: ApiRoom }>("/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: `${firstName(user?.name)}'s Room`,
          privacy: "PUBLIC",
        }),
      });
      router.push(`/rooms/${room.id}`);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Couldn't create room");
      setCreating(false);
    }
  };

  const featured = rooms?.[0];

  return (
    <>
      <TopBar greeting subtitle="Pick a room or start your own." />

      <div className="px-6 lg:px-8 py-6 space-y-10">
        {justConnectedSpotify && (
          <div className="rounded-2xl border border-neon-green/30 bg-neon-green/[0.08] px-5 py-3 text-sm">
            ✨ Spotify connected. You can now host rooms and queue real tracks.
          </div>
        )}

        {/* Featured room (or empty state) */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          {featured ? (
            <FeaturedRoomCard room={featured} onJoin={() => router.push(`/rooms/${featured.id}`)} />
          ) : (
            <EmptyHero
              loading={rooms === null && !error}
              error={error}
              onCreate={createRoom}
              creating={creating}
              spotifyReady={!!user?.spotifyId}
            />
          )}

          <SidebarStats user={user} roomCount={rooms?.length ?? 0} />
        </section>

        {/* Live rooms grid */}
        <section>
          <SectionHeader title="Live rooms" subtitle="Rooms vibing right now" />
          {error && (
            <GlassCard className="p-5 text-sm text-rose-300">
              {error}{" "}
              <button onClick={() => { setError(null); void loadRooms(); }} className="underline ml-2">
                Try again
              </button>
            </GlassCard>
          )}
          {!error && rooms === null && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <GlassCard key={i} className="h-44 animate-pulse opacity-60" />
              ))}
            </div>
          )}
          {!error && rooms !== null && rooms.length === 0 && (
            <GlassCard className="p-8 text-center">
              <Radio className="h-8 w-8 mx-auto text-neon-green/70" />
              <h4 className="mt-4 font-display text-xl">No live rooms yet</h4>
              <p className="mt-1 text-sm text-white/55 max-w-md mx-auto">
                You'll be the first. Start a room and invite friends with the room code.
              </p>
              <div className="mt-5">
                <Button onClick={createRoom} disabled={creating}>
                  <Plus className="h-4 w-4" />
                  {creating ? "Creating…" : "Start a room"}
                </Button>
              </div>
            </GlassCard>
          )}
          {!error && rooms && rooms.length > 0 && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rooms.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 + i * 0.04 }}
                >
                  <RealRoomCard room={r} onJoin={() => router.push(`/rooms/${r.id}`)} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents — kept local so the page is self-contained.
// ---------------------------------------------------------------------------

function FeaturedRoomCard({ room, onJoin }: { room: ApiRoom; onJoin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard strong className="relative overflow-hidden h-full">
        <div className="grid sm:grid-cols-[1fr_1.1fr] h-full">
          <div className="relative aspect-square sm:aspect-auto overflow-hidden bg-brand-soft">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-ink-900" />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/80 mb-4">
                <Flame className="h-3 w-3 text-neon-green" />
                Live now
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                {room.name}
              </h2>
              {room.vibe && <p className="mt-1 text-white/55">{room.vibe}</p>}

              <div className="mt-5 flex items-center gap-3">
                <Avatar
                  name={room.host.name}
                  color={room.host.avatarColor ?? "from-neon-green to-neon-blue"}
                  imageUrl={room.host.avatarUrl ?? undefined}
                  size={32}
                />
                <div>
                  <div className="text-sm">
                    Hosted by <span className="font-medium">{room.host.name}</span>
                  </div>
                  <div className="text-xs text-white/45">
                    {room._count.participants} listening{room.genre ? ` · ${room.genre}` : ""}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <Visualizer className="h-9" intense />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={onJoin}>
                Join the room
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function EmptyHero({
  loading,
  error,
  onCreate,
  creating,
  spotifyReady,
}: {
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  creating: boolean;
  spotifyReady: boolean;
}) {
  return (
    <GlassCard strong className="relative overflow-hidden h-full p-8 sm:p-10 flex flex-col justify-between min-h-[280px]">
      <div className="absolute inset-0 bg-brand-soft opacity-40" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/80 mb-4">
          <Sparkles className="h-3 w-3 text-neon-green" />
          Fresh start
        </div>
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          It's quiet in here.
        </h2>
        <p className="mt-1 text-white/60 max-w-md">
          {loading
            ? "Looking for live rooms…"
            : error
            ? "Couldn't load rooms — give it a sec."
            : spotifyReady
            ? "Be the first to start a room. Friends can join with the room code."
            : "Connect Spotify in onboarding to start hosting rooms with real music."}
        </p>
      </div>
      <div className="relative mt-6">
        <Button onClick={onCreate} disabled={creating || !spotifyReady}>
          <Plus className="h-4 w-4" />
          {creating ? "Creating…" : "Create a room"}
        </Button>
        {!spotifyReady && (
          <span className="ml-3 text-xs text-white/45">
            Spotify required to host
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function SidebarStats({
  user,
  roomCount,
}: {
  user: { name: string; spotifyProduct: string | null; spotifyId: string | null; createdAt: string } | null;
  roomCount: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
      <StatCard
        icon={Music2}
        label="Spotify"
        value={
          user?.spotifyId
            ? user.spotifyProduct === "premium"
              ? "Premium · connected"
              : "Connected"
            : "Not connected"
        }
        hint={user?.spotifyId ? "Ready to host" : "Connect to host rooms"}
        accent={!!user?.spotifyId}
      />
      <StatCard
        icon={Radio}
        label="Live rooms"
        value={String(roomCount)}
        hint={roomCount === 0 ? "Be the first" : "Across VibeTogether"}
      />
      <StatCard
        icon={Sparkles}
        label="Signed in as"
        value={user?.name ?? "—"}
        hint={user ? `Joined ${formatJoin(user.createdAt)}` : ""}
      />
    </div>
  );
}

function RealRoomCard({ room, onJoin }: { room: ApiRoom; onJoin: () => void }) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="relative h-32 bg-brand-soft" />
      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-neon-green">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
          Live{room.genre ? ` · ${room.genre}` : ""}
        </div>
        <h4 className="mt-1 font-display text-lg font-semibold tracking-tight">{room.name}</h4>
        <div className="mt-1 text-xs text-white/50 truncate">
          {room.host.name} · {room._count.participants} listening
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onJoin}>
            Join <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h3 className="font-display text-2xl font-semibold tracking-tight">{title}</h3>
        {subtitle && <div className="text-xs text-white/45 mt-0.5">{subtitle}</div>}
      </div>
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
  icon: typeof Music2;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <GlassCard className={`p-5 ${accent ? "ring-1 ring-neon-green/30 shadow-glow" : ""}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/45">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold tracking-tight ${accent ? "text-gradient" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-white/50 mt-1">{hint}</div>
    </GlassCard>
  );
}

function firstName(full?: string | null) {
  if (!full) return "Your";
  const first = full.split(" ")[0];
  return first ?? full;
}

function formatJoin(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "recently";
  }
}
