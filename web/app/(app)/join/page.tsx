"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Plus } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useUserStore } from "@/lib/store/user";

export default function JoinPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create room form
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC");

  const join = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError(null);
    setJoining(true);
    try {
      const { roomId } = await apiFetch<{ roomId: string }>("/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: trimmed }),
      });
      router.push(`/rooms/${roomId}`);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Couldn't join that room");
      setJoining(false);
    }
  };

  const create = async () => {
    if (creating) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the room a name first.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const { room } = await apiFetch<{ room: { id: string } }>("/rooms", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, privacy }),
      });
      router.push(`/rooms/${room.id}`);
    } catch (e) {
      setError((e as { message?: string }).message ?? "Couldn't create room");
      setCreating(false);
    }
  };

  return (
    <>
      <TopBar title="Join or create a room" />
      <div className="px-6 lg:px-8 py-6 space-y-8">
        {error && (
          <GlassCard className="p-4 text-sm text-rose-300">{error}</GlassCard>
        )}

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
                Paste a room code from a friend. We'll sync you instantly.
              </p>

              <div className="mt-6 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  placeholder="e.g. VIBE-XXXXXX"
                  className="flex-1 rounded-full bg-white/[0.04] border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-green/40 transition-colors font-mono uppercase tracking-wider"
                />
                <Button onClick={join} disabled={!code.trim() || joining}>
                  {joining ? "Joining…" : "Join"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>

          {/* Create */}
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
                Choose a name and privacy — invite friends in seconds with the room code.
              </p>

              <div className="mt-5 grid gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Room name"
                  className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-green/40 transition-colors"
                />
                <div className="flex gap-2 text-xs">
                  {(["PUBLIC", "FRIENDS", "PRIVATE"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPrivacy(v)}
                      className={`rounded-full px-3 py-1.5 transition-all ${
                        v === privacy
                          ? "bg-brand-gradient text-ink-950"
                          : "bg-white/[0.04] border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {v === "PUBLIC"
                        ? "Public"
                        : v === "FRIENDS"
                        ? "Friends only"
                        : "Private link"}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={create}
                  disabled={creating || !user?.spotifyId}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4" />
                  {creating
                    ? "Creating…"
                    : !user?.spotifyId
                    ? "Connect Spotify to host"
                    : "Start the room"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}
