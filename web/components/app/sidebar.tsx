"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Users,
  Radio,
  Settings,
  Plus,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Avatar } from "@/components/ui/avatar";
import { mockRooms, mockUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/profile", label: "Profile", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-4 p-4 pr-0">
      <div className="px-3 pt-2">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
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

      <button className="mx-2 mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-ink-950 font-medium px-4 py-3 hover:brightness-110 transition-all shadow-glow">
        <Plus className="h-4 w-4" />
        Create a Room
      </button>

      {/* Friends online */}
      <div className="mt-4 flex-1 overflow-y-auto px-2 no-scrollbar">
        <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-wider text-white/40">
          <span>Friends · Listening</span>
          <span className="text-white/50">5</span>
        </div>
        <div className="mt-2 space-y-1">
          {mockUsers.filter((u) => u.status === "listening" && u.id !== "u_self").slice(0, 5).map((u) => (
            <Link
              key={u.id}
              href={`/rooms/r_latenight`}
              className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all hover:bg-white/[0.04]"
            >
              <Avatar name={u.name} color={u.avatarColor} size={28} status="listening" />
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{u.name}</div>
                <div className="text-[11px] text-white/45 truncate">
                  {u.currentlyPlaying ?? "in a room"}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 px-1 text-[10px] uppercase tracking-wider text-white/40">
          Live rooms
        </div>
        <div className="mt-2 space-y-1">
          {mockRooms.slice(0, 3).map((r) => (
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
                  <div className="text-[11px] text-white/45">{r.listeners} listening</div>
                </div>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* User pill */}
      <div className="mt-auto mx-1">
        <div className="flex items-center gap-3 rounded-2xl glass p-3">
          <Avatar name="Sonali B" color="from-neon-green to-neon-blue" size={36} status="listening" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">Sonali B</div>
            <div className="text-[11px] text-neon-green truncate">Spotify Premium</div>
          </div>
          <Settings className="h-4 w-4 text-white/40 hover:text-white cursor-pointer" />
        </div>
      </div>
    </aside>
  );
}
