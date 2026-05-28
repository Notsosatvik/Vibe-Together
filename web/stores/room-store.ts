// Zustand store for live room state. The showcase pages don't use it yet —
// they render mock data — but this is the wiring point for the production app.

import { create } from "zustand";

export type Participant = {
  id: string;
  name: string;
  handle: string;
  avatarColor: string | null;
  role: "HOST" | "COHOST" | "LISTENER";
};

export type PlaybackState = {
  trackUri: string | null;
  isPlaying: boolean;
  positionMs: number;
  lastSyncAt: number;
};

type RoomStore = {
  roomId: string | null;
  hostId: string | null;
  participants: Participant[];
  playback: PlaybackState;
  chat: { id: string; userId: string; text: string; createdAt: number }[];
  reactions: { id: string; userId: string; emoji: string; atMs: number }[];

  setRoom: (state: Partial<RoomStore>) => void;
  applyPlayback: (p: PlaybackState) => void;
  addMessage: (m: RoomStore["chat"][number]) => void;
  fireReaction: (r: Omit<RoomStore["reactions"][number], "id">) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (userId: string) => void;
  reset: () => void;
};

export const useRoomStore = create<RoomStore>((set) => ({
  roomId: null,
  hostId: null,
  participants: [],
  playback: {
    trackUri: null,
    isPlaying: false,
    positionMs: 0,
    lastSyncAt: Date.now(),
  },
  chat: [],
  reactions: [],

  setRoom: (state) => set(state),
  applyPlayback: (playback) => set({ playback }),
  addMessage: (m) => set((s) => ({ chat: [...s.chat, m].slice(-200) })),
  fireReaction: (r) =>
    set((s) => ({
      reactions: [...s.reactions, { ...r, id: `${r.userId}-${Date.now()}` }].slice(-50),
    })),
  addParticipant: (p) =>
    set((s) => ({
      participants: s.participants.find((x) => x.id === p.id)
        ? s.participants
        : [...s.participants, p],
    })),
  removeParticipant: (userId) =>
    set((s) => ({ participants: s.participants.filter((p) => p.id !== userId) })),
  reset: () =>
    set({
      roomId: null,
      hostId: null,
      participants: [],
      playback: {
        trackUri: null,
        isPlaying: false,
        positionMs: 0,
        lastSyncAt: Date.now(),
      },
      chat: [],
      reactions: [],
    }),
}));
