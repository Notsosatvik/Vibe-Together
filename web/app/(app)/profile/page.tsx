"use client";

import { motion } from "framer-motion";
import { Music, Calendar, AtSign, Mail } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar } from "@/components/ui/avatar";
import { useUserStore } from "@/lib/store/user";

export default function ProfilePage() {
  const user = useUserStore((s) => s.user);

  if (!user) return null; // AuthGate handles redirect

  return (
    <>
      <TopBar title="Your profile" subtitle="Your sound, your story." />
      <div className="px-6 lg:px-8 py-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard strong className="relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-soft opacity-50" />
            <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Avatar
                name={user.name}
                imageUrl={user.avatarUrl ?? undefined}
                color={user.avatarColor ?? "from-neon-green to-neon-blue"}
                size={96}
                ring
              />
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wider text-neon-green">
                  VibeTogether member
                </div>
                <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                  {user.name}
                </h1>
                <p className="text-white/55 mt-1">
                  @{user.handle} · joined {formatJoin(user.createdAt)}
                </p>
                {user.bio && (
                  <p className="mt-3 text-sm text-white/75 max-w-lg">{user.bio}</p>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Real account details */}
        <section className="grid sm:grid-cols-2 gap-4">
          <DetailRow icon={Mail} label="Email" value={user.email} />
          <DetailRow icon={AtSign} label="Handle" value={`@${user.handle}`} />
          <DetailRow
            icon={Music}
            label="Spotify"
            value={
              user.spotifyId
                ? user.spotifyProduct === "premium"
                  ? "Connected · Premium"
                  : "Connected"
                : "Not connected"
            }
          />
          <DetailRow
            icon={Calendar}
            label="Joined"
            value={formatJoin(user.createdAt)}
          />
        </section>
      </div>
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Music;
  label: string;
  value: string;
}) {
  return (
    <GlassCard className="p-4 flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5">
        <Icon className="h-4 w-4 text-neon-green" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-white/45">
          {label}
        </div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </GlassCard>
  );
}

function formatJoin(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "recently";
  }
}
