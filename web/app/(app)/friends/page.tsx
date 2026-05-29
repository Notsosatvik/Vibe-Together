"use client";

import { useState } from "react";
import { UserPlus, Search, Users } from "lucide-react";
import { TopBar } from "@/components/app/topbar";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";

// Real friends/followers will come from the API. The backend exposes user
// lookup by handle but no friends-list endpoint yet — so for honesty we show
// an empty state with an "Add by handle" lookup that hits the real /users/:handle.

type LookedUpUser = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string | null;
};

export default function FriendsPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<LookedUpUser | "not-found" | null>(null);

  const search = async () => {
    const handle = query.replace(/^@/, "").trim();
    if (!handle) return;
    setSearching(true);
    setResult(null);
    try {
      const { user } = await apiFetch<{ user: LookedUpUser }>(
        `/users/${encodeURIComponent(handle)}`
      );
      setResult(user);
    } catch {
      setResult("not-found");
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <TopBar title="Friends" subtitle="Find people to listen with" />

      <div className="px-6 lg:px-8 py-6 space-y-8">
        {/* Add by handle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-full glass px-4 py-2.5">
            <Search className="h-4 w-4 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Look up by @handle…"
              className="flex-1 bg-transparent text-sm placeholder:text-white/35 outline-none"
            />
          </div>
          <Button onClick={search} disabled={searching || !query.trim()}>
            <UserPlus className="h-4 w-4" />
            {searching ? "Searching…" : "Look up"}
          </Button>
        </div>

        {result === "not-found" && (
          <GlassCard className="p-4 text-sm text-white/70">
            No one with that handle yet.
          </GlassCard>
        )}

        {result && result !== "not-found" && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={result.name}
                imageUrl={result.avatarUrl ?? undefined}
                color={result.avatarColor ?? "from-neon-green to-neon-blue"}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{result.name}</div>
                <div className="text-xs text-white/50 truncate">@{result.handle}</div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Empty state */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-semibold tracking-tight">
              Your people
            </h3>
            <Users className="h-4 w-4 text-white/40" />
          </div>
          <GlassCard className="p-8 text-center">
            <Users className="h-8 w-8 mx-auto text-neon-green/70" />
            <h4 className="mt-4 font-display text-xl">No friends added yet</h4>
            <p className="mt-1 text-sm text-white/55 max-w-md mx-auto">
              Friends are coming soon — for now, share a room code with people you want
              to listen with. They'll join your room directly.
            </p>
          </GlassCard>
        </section>
      </div>
    </>
  );
}
