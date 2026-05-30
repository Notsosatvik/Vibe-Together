"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  LogOut,
  Users as UsersIcon,
  Share2,
  Crown,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { apiFetch } from "@/lib/api";
import { useUserStore } from "@/lib/store/user";
import { useMe } from "@/lib/hooks/use-me";
import { RoomPlayer } from "@/components/room/room-player";
import { getSocket } from "@/lib/socket";

type ApiUserMini = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string | null;
};

type ApiParticipant = {
  id: string;
  role: "HOST" | "COHOST" | "LISTENER";
  user: ApiUserMini;
};

type ApiQueueItem = {
  id: string;
  trackUri: string;
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  durationMs: number;
  addedById: string;
  position: number;
};

type ApiRoom = {
  id: string;
  name: string;
  code: string;
  privacy: "PUBLIC" | "FRIENDS" | "PRIVATE";
  genre: string | null;
  vibe: string | null;
  hostId: string;
  host: ApiUserMini;
  participants: ApiParticipant[];
  queueItems: ApiQueueItem[];
  createdAt: string;
};

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { status } = useMe();
  const me = useUserStore((s) => s.user);

  const [room, setRoom] = useState<ApiRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auth gate (this page is outside the (app) group so we guard it here)
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const { room } = await apiFetch<{ room: ApiRoom }>(`/rooms/${id}`);
      setRoom(room);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Couldn't load this room");
    }
  }, [id]);

  // Initial load + join (if not already a participant)
  useEffect(() => {
    void load();
  }, [load]);

  // Auto-join via room code when we have one and we're not in the participant list
  useEffect(() => {
    if (!room || !me) return;
    const alreadyIn = room.participants.some((p) => p.user.id === me.id);
    if (alreadyIn) return;
    apiFetch("/rooms/join", {
      method: "POST",
      body: JSON.stringify({ code: room.code }),
    })
      .then(() => load())
      .catch(() => {
        /* room may be private — that's fine, we'll just view */
      });
  }, [room, me, load]);

  // Live participants list — subscribe to room:presence so the host (and
  // everyone else) sees joiners appear / leavers disappear in real time.
  // Without this, the list is set once from /rooms/{id} on mount and never
  // updates, so the host can't see other users join their room.
  //
  // The server now ships full participant info on status:"joined" so we can
  // append directly without a round-trip back to the REST endpoint. On
  // status:"left" we just get a userId and filter.
  useEffect(() => {
    if (!room) return;
    const sock = getSocket();
    type Presence = {
      userId: string;
      status: "joined" | "left";
      participant?: ApiUserMini & { role: "HOST" | "COHOST" | "LISTENER" };
    };
    const onPresence = ({ userId, status, participant }: Presence) => {
      setRoom((prev) => {
        if (!prev) return prev;
        if (status === "joined" && participant) {
          // Dedupe — server emits to the joiner too, and reconnects re-emit.
          if (prev.participants.some((p) => p.user.id === participant.id)) {
            return prev;
          }
          const newParticipant: ApiParticipant = {
            // No RoomParticipant.id from the socket — use a stable synthetic
            // key derived from the user id (good enough for React reconciliation
            // until the next full reload).
            id: `live-${participant.id}`,
            role: participant.role,
            user: {
              id: participant.id,
              name: participant.name,
              handle: participant.handle,
              avatarUrl: participant.avatarUrl,
              avatarColor: participant.avatarColor,
            },
          };
          return { ...prev, participants: [...prev.participants, newParticipant] };
        }
        if (status === "left") {
          return {
            ...prev,
            participants: prev.participants.filter((p) => p.user.id !== userId),
          };
        }
        return prev;
      });
    };
    sock.on("room:presence", onPresence);
    return () => {
      sock.off("room:presence", onPresence);
    };
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const shareRoom = async () => {
    if (!room) return;
    const url = `${window.location.origin}/rooms/${room.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: room.name, text: "Listen with me on VibeTogether", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* ignore */
    }
  };

  if (error) {
    return (
      <CenteredMessage>
        <div className="text-rose-300 mb-3">{error}</div>
        <Link href="/dashboard">
          <Button>Back to home</Button>
        </Link>
      </CenteredMessage>
    );
  }

  if (!room) {
    return (
      <CenteredMessage>
        <div className="flex flex-col items-center gap-3 opacity-80">
          <Logo />
          <div className="text-xs uppercase tracking-wider text-white/40">Loading room…</div>
        </div>
      </CenteredMessage>
    );
  }

  const isHost = me?.id === room.hostId;

  return (
    <div className="relative min-h-screen">
      {/* Soft brand backdrop — no fake track colors */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-brand-soft opacity-50"
      />

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 backdrop-blur-xl bg-ink-950/70 border-b border-white/8 px-4 sm:px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="hidden sm:flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-mono hover:bg-white/10 transition-all"
            title="Copy room code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-neon-green" /> COPIED
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> {room.code}
              </>
            )}
          </button>
          <Button size="sm" variant="secondary" onClick={shareRoom}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Link href="/dashboard">
            <Button size="sm" variant="ghost">
              <LogOut className="h-4 w-4" /> Leave
            </Button>
          </Link>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 grid lg:grid-cols-[1.4fr_1fr] gap-4 max-w-7xl mx-auto">
        {/* Now Playing — honest placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard strong className="p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/80 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
              Live room
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              {room.name}
            </h1>
            {room.vibe && <p className="mt-1 text-white/55">{room.vibe}</p>}

            <div className="mt-5 flex items-center gap-3">
              <Avatar
                name={room.host.name}
                imageUrl={room.host.avatarUrl ?? undefined}
                color={room.host.avatarColor ?? "from-neon-green to-neon-blue"}
                size={36}
              />
              <div>
                <div className="text-sm">
                  Hosted by{" "}
                  <span className="font-medium">{room.host.name}</span>
                  {isHost && <span className="text-neon-green ml-1">(you)</span>}
                </div>
                <div className="text-xs text-white/45">
                  @{room.host.handle}
                  {room.genre ? ` · ${room.genre}` : ""}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <RoomPlayer
                roomId={room.id}
                isHost={isHost}
                initialPlayback={{
                  trackUri:
                    room.queueItems.find((q) => q.position === 1)?.trackUri ?? null,
                  isPlaying: false,
                  positionMs: 0,
                  lastSyncAt: Date.now(),
                }}
                initialQueue={room.queueItems.map((q) => ({
                  id: q.id,
                  trackUri: q.trackUri,
                  trackName: q.trackName,
                  artistName: q.artistName,
                  albumArtUrl: q.albumArtUrl,
                  durationMs: q.durationMs,
                  addedById: q.addedById,
                  position: q.position,
                }))}
              />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
              <div className="text-xs text-white/55">Room code</div>
              <button
                onClick={copyCode}
                className="font-mono text-sm tracking-wider hover:text-neon-green transition-colors flex items-center gap-2"
              >
                {room.code}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-neon-green" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/40" />
                )}
              </button>
              <div className="ml-auto text-xs text-white/40">
                {room.privacy === "PUBLIC"
                  ? "Public"
                  : room.privacy === "FRIENDS"
                  ? "Friends only"
                  : "Private link"}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Participants — real */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-neon-green" />
                In the room
              </h3>
              <span className="text-xs text-white/45">
                {room.participants.length}
              </span>
            </div>

            <ul className="space-y-2">
              {room.participants.length === 0 ? (
                <li className="text-sm text-white/45 px-2 py-3">
                  Just you for now. Share the room code above.
                </li>
              ) : (
                room.participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.025] border border-white/8 px-3 py-2.5"
                  >
                    <Avatar
                      name={p.user.name}
                      imageUrl={p.user.avatarUrl ?? undefined}
                      color={p.user.avatarColor ?? "from-neon-green to-neon-blue"}
                      size={36}
                      status="listening"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {p.user.name}
                        {p.role === "HOST" && (
                          <Crown className="h-3 w-3 text-amber-400" aria-label="Host" />
                        )}
                        {p.user.id === me?.id && (
                          <span className="text-[11px] text-neon-green ml-1">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-white/45 truncate">
                        @{p.user.handle}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full grid place-items-center px-6">
      <div className="text-center">{children}</div>
    </div>
  );
}
