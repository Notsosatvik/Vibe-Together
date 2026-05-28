"use client";

import { Search, Bell, Inbox } from "lucide-react";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 backdrop-blur-xl bg-ink-950/60 border-b border-white/8 px-6 lg:px-8 py-4">
      <div>
        <div className="font-display text-2xl font-semibold tracking-tight">{title}</div>
        {subtitle && <div className="text-xs text-white/50 mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-full glass px-3.5 py-2 w-72">
          <Search className="h-4 w-4 text-white/40" />
          <input
            placeholder="Search rooms, songs, friends…"
            className="bg-transparent text-sm placeholder:text-white/35 outline-none w-full"
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">⌘K</kbd>
        </div>
        <button className="relative grid h-10 w-10 place-items-center rounded-full glass hover:bg-white/10 transition-all">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-neon-green" />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full glass hover:bg-white/10 transition-all">
          <Inbox className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
