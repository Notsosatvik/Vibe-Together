"use client";

import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export type Me = {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  bio: string | null;
  spotifyId: string | null;
  spotifyProduct: string | null;
  createdAt: string;
};

type UserState = {
  user: Me | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  loadMe: () => Promise<Me | null>;
  setUser: (u: Me | null) => void;
  clear: () => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  status: "idle",
  setUser: (u) =>
    set({ user: u, status: u ? "authenticated" : "unauthenticated" }),
  clear: () => set({ user: null, status: "unauthenticated" }),
  loadMe: async () => {
    // Don't double-load if we already have a user
    if (get().user) return get().user;
    set({ status: "loading" });
    try {
      const { user } = await apiFetch<{ user: Me }>("/users/me");
      set({ user, status: "authenticated" });
      return user;
    } catch {
      set({ user: null, status: "unauthenticated" });
      return null;
    }
  },
}));
