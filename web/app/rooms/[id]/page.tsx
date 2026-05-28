"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  Send,
  Smile,
  Mic2,
  ListMusic,
  Users as UsersIcon,
  Share2,
  LogOut,
  Plus,
  Crown,
  Heart,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AlbumArt } from "@/components/shared/album-art";
import { Visualizer } from "@/components/shared/visualizer";
import { Logo } from "@/components/shared/logo";
import { ReactionsOverlay } from "@/components/room/reactions-overlay";
import { Lyrics } from "@/components/room/lyrics";
import {
  getRoom,
  getTrack,
  getUser,
  mockChat,
  mockQueue,
  mockUsers,
} from "@/lib/mock-data";
import { cn, formatTime } from "@/lib/utils";

type Tab = "queue" | "chat" | "lyrics" | "people";

export default function RoomPage({ params }: { params: { id: string } }) {
  const room = getRoom(params.id);
  const track = getTrack(room.trackId);
  const host = getUser(room.hostId);

  const [tab, setTab] = useState<Tab>("chat");
  const [playing, setPlaying] = useState(true);
  const [progressMs, setProgressMs] = useState(room.trackProgressMs);
  const [reactionTrigger, setReactionTrigger] = useState(0);
  const [chat, setChat] = useState(mockChat);
  const [draft, setDraft] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Synthetic progress tick (this would be socket-driven in production)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgressMs((p) => (p + 250 < track.durationMs ? p + 250 : 0));
    }, 250);
    return () => clearInterval(id);
  }, [playing, track.durationMs]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
  }, [chat.length, tab]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setChat((c) => [
      ...c,
      { id: `m_${Date.now()}`, userId: "u_self", text, at: 0 },
    ]);
    setDraft("");
  };

  const burstReaction = () => setReactionTrigger((t) => t + 1);

  const [c1, c2] = track.colors;

  const participants = useMemo(
    () => room.participants.map((id) => getUser(id)),
    [room.participants]
  );

  return (
    <div className="relative min-h-screen">
      {/* Dynamic backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-700"
        style={{
          backgroundImage: `radial-gradient(ellipse 800px 600px at 20% 0%, ${c1}55, transparent 60%),
                           radial-gradient(ellipse 800px 500px at 80% 100%, ${c2}55, transparent 60%),
                           radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(0,0,0,0.6), transparent 70%)`,
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-ink-950/40 backdrop-blur-[2px]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 noise opacity-[0.08] mix-blend-overlay" />

      {/* Room header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/40 border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Logo size={26} />
          </Link>
          <div className="hidden sm:block h-6 w-px bg-white/10" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">
                Live · {room.genre}
              </span>
            </div>
            <div className="font-display text-xl font-semibold tracking-tight">
              {room.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
            <span className="font-mono text-neon-green">7ms</span>
            <span className="text-white/45">drift</span>
            <span className="mx-1 text-white/20">·</span>
            <UsersIcon className="h-3 w-3" /> {room.listeners}
          </div>
          <Button variant="secondary" size="sm">
            <Share2 className="h-4 w-4" />
            Invite
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
          </Link>
        </div>
      </header>

      {/* Main grid */}
      <div className="mx-auto max-w-[1500px] grid lg:grid-cols-[1fr_400px] gap-6 px-6 py-6">
        {/* Player column */}
        <section className="relative">
          <GlassCard strong className="relative overflow-hidden">
            <ReactionsOverlay trigger={reactionTrigger} />

            <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-6 p-6 sm:p-8 min-h-[560px]">
              {/* Left: art + meta */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative">
                  <div
                    className="absolute -inset-12 rounded-full opacity-60 blur-3xl"
                    style={{
                      background: `radial-gradient(circle, ${c1}aa 0%, ${c2}66 50%, transparent 70%)`,
                    }}
                  />
                  <AlbumArt
                    gradient={track.albumGradient}
                    seed={track.id}
                    className={cn(
                      "h-56 w-56 sm:h-64 sm:w-64 transition-all duration-700",
                      playing ? "animate-spin-slow" : ""
                    )}
                    rounded="rounded-full"
                  />
                  <div className="absolute inset-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-950 border-2 border-white/20" />
                </div>

                <div className="mt-7 text-[11px] uppercase tracking-wider text-neon-green">
                  Now Playing
                </div>
                <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  {track.title}
                </h1>
                <div className="mt-1 text-white/65">{track.artist} · {track.album}</div>

                <div className="mt-6 w-full max-w-md">
                  <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-gradient transition-[width] duration-200 ease-linear"
                      style={{ width: `${(progressMs / track.durationMs) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] font-mono text-white/55">
                    <span>{formatTime(progressMs / 1000)}</span>
                    <span>{formatTime(track.durationMs / 1000)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-6 flex items-center gap-4">
                  <button className="text-white/60 hover:text-white transition-colors">
                    <Shuffle className="h-5 w-5" />
                  </button>
                  <button className="text-white/80 hover:text-white transition-colors">
                    <SkipBack className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-ink-950 shadow-glow hover:scale-105 active:scale-95 transition-all"
                  >
                    {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
                  </button>
                  <button className="text-white/80 hover:text-white transition-colors">
                    <SkipForward className="h-6 w-6" />
                  </button>
                  <button className="text-white/60 hover:text-white transition-colors">
                    <Repeat className="h-5 w-5" />
                  </button>
                </div>

                {/* Reactions */}
                <div className="mt-6 flex items-center gap-1.5">
                  {["🔥", "✨", "💜", "🎧", "🚀"].map((e) => (
                    <button
                      key={e}
                      onClick={burstReaction}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.12] hover:scale-110 transition-all text-lg"
                    >
                      {e}
                    </button>
                  ))}
                  <div className="ml-3 flex items-center gap-1.5 text-xs text-white/60">
                    <Heart className="h-3.5 w-3.5 text-pink-400" />
                    1.4K reactions tonight
                  </div>
                </div>
              </div>

              {/* Right: visualizer + listeners + queue preview */}
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wider text-white/45">
                      In sync
                    </div>
                    <div className="text-[11px] font-mono text-neon-green">
                      avg drift 7ms
                    </div>
                  </div>
                  <Visualizer className="mt-3 h-16" intense />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {participants.slice(0, 6).map((u) => (
                        <Avatar
                          key={u.id}
                          name={u.name}
                          color={u.avatarColor}
                          size={30}
                          ring
                          status="listening"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-white/55">
                      <span className="text-white">{room.listeners}</span> listening
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] uppercase tracking-wider text-white/45">
                      Up next
                    </div>
                    <button
                      onClick={() => setTab("queue")}
                      className="text-[11px] text-neon-green hover:underline"
                    >
                      Full queue →
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {mockQueue.slice(0, 3).map((q, i) => {
                      const t = getTrack(q.trackId);
                      const u = getUser(q.addedBy);
                      return (
                        <li
                          key={q.trackId}
                          className="flex items-center gap-2.5"
                        >
                          <span className="w-4 text-center text-[11px] text-white/40 font-mono">
                            {i + 1}
                          </span>
                          <AlbumArt
                            gradient={t.albumGradient}
                            seed={t.id}
                            className="h-9 w-9"
                            rounded="rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{t.title}</div>
                            <div className="text-[11px] text-white/45 truncate">
                              {t.artist} · added by {u.name}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/8 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45">
                    Hosted by
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Avatar name={host.name} color={host.avatarColor} size={36} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {host.name}
                        <Crown className="h-3 w-3 text-amber-400" />
                      </div>
                      <div className="text-[11px] text-white/45">
                        Curating: {room.vibe}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Side panel */}
        <aside className="lg:sticky lg:top-[88px] h-fit">
          <GlassCard strong className="overflow-hidden flex flex-col h-[640px]">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-white/8 p-2">
              <div className="flex gap-1">
                <TabButton tab="chat" active={tab} onClick={setTab} icon={Mic2} label="Chat" />
                <TabButton tab="queue" active={tab} onClick={setTab} icon={ListMusic} label="Queue" />
                <TabButton tab="lyrics" active={tab} onClick={setTab} icon={Smile} label="Lyrics" />
                <TabButton tab="people" active={tab} onClick={setTab} icon={UsersIcon} label="People" />
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {tab === "chat" && (
                    <ChatPanel
                      chat={chat}
                      draft={draft}
                      setDraft={setDraft}
                      send={send}
                      scrollRef={chatScrollRef}
                    />
                  )}
                  {tab === "queue" && <QueuePanel />}
                  {tab === "lyrics" && <Lyrics progressSec={progressMs / 1000} />}
                  {tab === "people" && <PeoplePanel />}
                </motion.div>
              </AnimatePresence>
            </div>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
  icon: Icon,
  label,
}: {
  tab: Tab;
  active: Tab;
  onClick: (t: Tab) => void;
  icon: typeof Mic2;
  label: string;
}) {
  const isActive = tab === active;
  return (
    <button
      onClick={() => onClick(tab)}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all",
        isActive
          ? "bg-white/10 text-white"
          : "text-white/55 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ChatPanel({
  chat,
  draft,
  setDraft,
  send,
  scrollRef,
}: {
  chat: { id: string; userId: string; text: string; at: number }[];
  draft: string;
  setDraft: (v: string) => void;
  send: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {chat.map((m) => {
          const u = getUser(m.userId);
          const isSelf = m.userId === "u_self";
          return (
            <div
              key={m.id}
              className={cn("flex items-start gap-2", isSelf && "flex-row-reverse")}
            >
              {!isSelf && (
                <Avatar name={u.name} color={u.avatarColor} size={26} />
              )}
              <div className={cn("min-w-0 max-w-[80%]", isSelf && "text-right")}>
                {!isSelf && (
                  <div className="text-[11px] text-white/45 mb-0.5">{u.name}</div>
                )}
                <div
                  className={cn(
                    "inline-block rounded-2xl px-3 py-1.5 text-sm leading-snug",
                    isSelf
                      ? "bg-brand-gradient text-ink-950 rounded-tr-sm"
                      : "bg-white/[0.06] border border-white/8 rounded-tl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div className="text-[11px] text-white/40 text-center pt-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" />
              <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:0.15s]" />
              <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce [animation-delay:0.3s]" />
            </span>
            Kai is typing…
          </span>
        </div>
      </div>
      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/8 px-3 py-2">
          <Smile className="h-4 w-4 text-white/45" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Say something to the room…"
            className="flex-1 bg-transparent text-sm placeholder:text-white/35 outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-ink-950 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

function QueuePanel() {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
        {mockQueue.map((q, i) => {
          const t = getTrack(q.trackId);
          const u = getUser(q.addedBy);
          return (
            <div
              key={q.trackId}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04] transition-all"
            >
              <span className="w-5 text-center text-[11px] text-white/40 font-mono">
                {i + 1}
              </span>
              <AlbumArt
                gradient={t.albumGradient}
                seed={t.id}
                className="h-11 w-11"
                rounded="rounded-md"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.title}</div>
                <div className="text-[11px] text-white/45 truncate">
                  {t.artist}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Avatar name={u.name} color={u.avatarColor} size={20} />
                <span className="hidden sm:inline text-[11px] text-white/45">
                  {u.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/8 p-3">
        <button className="w-full rounded-full border border-dashed border-white/15 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" />
          Add a song to the queue
        </button>
      </div>
    </>
  );
}

function PeoplePanel() {
  const listening = mockUsers.filter((u) => u.status !== "offline");
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-white/45 mb-2">
          In this room · {listening.length}
        </div>
        <ul className="space-y-1.5">
          {listening.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03] transition-all"
            >
              <Avatar
                name={u.name}
                color={u.avatarColor}
                size={32}
                status={u.status}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.name}</div>
                <div className="text-[11px] text-white/45 truncate">
                  @{u.handle} · in sync
                </div>
              </div>
              <Volume2 className="h-3.5 w-3.5 text-neon-green" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
