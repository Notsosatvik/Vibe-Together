"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  Users,
  Radio,
  Settings,
  Plus,
  Sparkles,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiFetch, logout } from "@/lib/api";
import { useUserStore } from "@/lib/store/user";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SidebarRoom = {
  id: string;
  name: string;
  _count: { participants: number };
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clear);
  const [liveRooms, setLiveRooms] = useState<SidebarRoom[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch<{ rooms: SidebarRoom[] }>("/rooms")
      .then((r) => {
        if (alive) setLiveRooms(r.rooms ?? []);
      })
      .catch(() => {
        /* fine — sidebar is decorative if this fails */
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  const onLogout = async () => {
    await logout();
    clearUser();
    router.push("/login");
  };

  const onCreate = async () => {
    if (creating || !user) return;
    setCreating(true);
    try {
      const { room } = await apiFetch<{ room: { id: string } }>("/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: `${firstName(user.name)}'s Room`,
          privacy: "PUBLIC",
        }),
      });
      router.push(`/rooms/${room.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-4 p-4 pr-0">
      <div className="px-3 pt-2">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-white/[0.06] text-white shadow-inset"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <item.icon
                className={cn(
                  "h-4.5 w-4.5",
                  active ? "text-neon-green" : "text-white/50 group-hover:text-white/80"
                )}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onCreate}
        disabled={creating || !user?.spotifyId}
        title={!user?.spotifyId ? "Connect Spotify to host rooms" : "Create a room"}
        className="mx-2 mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-ink-950 font-medium px-4 py-3 hover:brightness-110 transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
        {creating ? "Creating…" : "Create a Room"}
      </button>

      {/* Live rooms — real data */}
      <div className="mt-4 flex-1 overflow-y-auto px-2 no-scrollbar">
        <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-wider text-white/40">
          <span>Live rooms</span>
          <span className="text-white/50">{liveRooms.length}</span>
        </div>
        <div className="mt-2 space-y-1">
          {liveRooms.length === 0 ? (
            <div className="px-2 py-3 text-[11px] text-white/40">
              No rooms live right now.
            </div>
          ) : (
            liveRooms.slice(0, 8).map((r) => (
              <Link
                key={r.id}
                href={`/rooms/${r.id}`}
                className="flex items-center justify-between rounded-xl px-2 py-2 transition-all hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-neon-green/40 to-neon-purple/40">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{r.name}</div>
                    <div className="text-[11px] text-white/45">
                      {r._count.participants} listening
                    </div>
                  </div>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* User pill — real user */}
      <div className="mt-auto mx-1">
        <div className="flex items-center gap-3 rounded-2xl glass p-3">
          <Avatar
            name={user?.name ?? "?"}
            imageUrl={user?.avatarUrl ?? undefined}
            color={user?.avatarColor ?? "from-neon-green to-neon-blue"}
            size={36}
            status="listening"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user?.name ?? "…"}</div>
            <div className="text-[11px] text-neon-green truncate">
              {user?.spotifyId
                ? user.spotifyProduct === "premium"
                  ? "Spotify Premium"
                  : "Spotify connected"
                : "Spotify not connected"}
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-white/40 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function firstName(full?: string | null) {
  if (!full) return "Your";
  return full.split(" ")[0] ?? full;
}
