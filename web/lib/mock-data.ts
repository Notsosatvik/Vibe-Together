// Mock universe for the frontend showcase.
// In production these come from Spotify Web API + our DB.

export type MockUser = {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  status?: "listening" | "idle" | "offline";
  currentlyPlaying?: string;
};

export type MockTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  // Tailwind gradient for fake album art
  albumGradient: string;
  // Dominant colors used for room theme
  colors: [string, string];
};

export type MockRoom = {
  id: string;
  name: string;
  hostId: string;
  listeners: number;
  genre: string;
  isLive: boolean;
  vibe: string;
  trackId: string;
  trackProgressMs: number;
  participants: string[]; // user ids
};

export type MockMessage = {
  id: string;
  userId: string;
  text: string;
  at: number; // seconds ago
  reaction?: string;
};

export const mockUsers: MockUser[] = [
  { id: "u_self", name: "You", handle: "you", avatarColor: "from-neon-green to-neon-blue", status: "listening" },
  { id: "u_aria", name: "Aria Chen", handle: "ariac", avatarColor: "from-fuchsia-500 to-purple-600", status: "listening", currentlyPlaying: "Midnight Drive" },
  { id: "u_kai", name: "Kai Tanaka", handle: "kai_t", avatarColor: "from-amber-400 to-rose-500", status: "listening", currentlyPlaying: "Neon Hearts" },
  { id: "u_lena", name: "Lena Park", handle: "lenap", avatarColor: "from-sky-400 to-indigo-600", status: "idle" },
  { id: "u_marco", name: "Marco Diaz", handle: "marcod", avatarColor: "from-emerald-400 to-teal-600", status: "listening", currentlyPlaying: "Sunset Boulevard" },
  { id: "u_sage", name: "Sage Okafor", handle: "sageo", avatarColor: "from-rose-400 to-orange-500", status: "listening" },
  { id: "u_juno", name: "Juno Park", handle: "junop", avatarColor: "from-violet-500 to-fuchsia-600", status: "offline" },
  { id: "u_remy", name: "Rémy Laurent", handle: "remyl", avatarColor: "from-cyan-400 to-blue-600", status: "listening" },
  { id: "u_noor", name: "Noor Rahman", handle: "noorr", avatarColor: "from-lime-400 to-green-600", status: "listening" },
];

export const mockTracks: MockTrack[] = [
  {
    id: "t_midnight",
    title: "Midnight Drive",
    artist: "Aerodive",
    album: "Neon Constellations",
    durationMs: 218_000,
    albumGradient: "from-purple-600 via-fuchsia-500 to-rose-500",
    colors: ["#A855F7", "#EC4899"],
  },
  {
    id: "t_neon",
    title: "Neon Hearts",
    artist: "Lumen Wave",
    album: "Afterglow",
    durationMs: 247_000,
    albumGradient: "from-sky-500 via-blue-500 to-indigo-600",
    colors: ["#3B82F6", "#6366F1"],
  },
  {
    id: "t_sunset",
    title: "Sunset Boulevard",
    artist: "The Forecasts",
    album: "Cassette Sun",
    durationMs: 192_000,
    albumGradient: "from-orange-500 via-amber-500 to-rose-500",
    colors: ["#F59E0B", "#F43F5E"],
  },
  {
    id: "t_lofi",
    title: "Slow Hours",
    artist: "Vela",
    album: "After Hours, Vol. 2",
    durationMs: 204_000,
    albumGradient: "from-emerald-400 via-teal-500 to-cyan-600",
    colors: ["#10B981", "#06B6D4"],
  },
  {
    id: "t_chase",
    title: "Chasing Static",
    artist: "Polaris Youth",
    album: "Signal Loss",
    durationMs: 231_000,
    albumGradient: "from-rose-500 via-pink-500 to-purple-600",
    colors: ["#F43F5E", "#A855F7"],
  },
  {
    id: "t_gold",
    title: "Gold Linings",
    artist: "Hana & The Drift",
    album: "Slowburn",
    durationMs: 268_000,
    albumGradient: "from-yellow-400 via-orange-500 to-pink-500",
    colors: ["#EAB308", "#EC4899"],
  },
];

export const mockRooms: MockRoom[] = [
  {
    id: "r_latenight",
    name: "Late Night Lounge",
    hostId: "u_aria",
    listeners: 42,
    genre: "Synthwave",
    isLive: true,
    vibe: "Cinematic · Driving",
    trackId: "t_midnight",
    trackProgressMs: 78_400,
    participants: ["u_aria", "u_kai", "u_marco", "u_sage", "u_remy", "u_noor"],
  },
  {
    id: "r_focus",
    name: "Deep Focus",
    hostId: "u_lena",
    listeners: 128,
    genre: "Lo-fi",
    isLive: true,
    vibe: "Calm · Productive",
    trackId: "t_lofi",
    trackProgressMs: 124_300,
    participants: ["u_lena", "u_noor", "u_sage"],
  },
  {
    id: "r_warehouse",
    name: "Warehouse 88",
    hostId: "u_marco",
    listeners: 217,
    genre: "House",
    isLive: true,
    vibe: "Punchy · Late",
    trackId: "t_chase",
    trackProgressMs: 41_900,
    participants: ["u_marco", "u_kai", "u_aria"],
  },
  {
    id: "r_throwback",
    name: "2008 Throwback",
    hostId: "u_kai",
    listeners: 64,
    genre: "Indie",
    isLive: true,
    vibe: "Nostalgic · Bright",
    trackId: "t_sunset",
    trackProgressMs: 12_000,
    participants: ["u_kai", "u_remy"],
  },
];

export const mockQueue: { trackId: string; addedBy: string }[] = [
  { trackId: "t_neon", addedBy: "u_kai" },
  { trackId: "t_lofi", addedBy: "u_sage" },
  { trackId: "t_chase", addedBy: "u_marco" },
  { trackId: "t_gold", addedBy: "u_noor" },
  { trackId: "t_sunset", addedBy: "u_aria" },
];

export const mockChat: MockMessage[] = [
  { id: "m1", userId: "u_aria", text: "this drop is unreal", at: 124 },
  { id: "m2", userId: "u_kai", text: "queueing Neon Hearts next 🔥", at: 102 },
  { id: "m3", userId: "u_marco", text: "vibes immaculate tonight", at: 80 },
  { id: "m4", userId: "u_sage", text: "first time in a vibe room — this is wild", at: 41 },
  { id: "m5", userId: "u_remy", text: "anyone else getting goosebumps", at: 9 },
];

export const getTrack = (id: string) =>
  mockTracks.find((t) => t.id === id) ?? mockTracks[0];

export const getUser = (id: string) =>
  mockUsers.find((u) => u.id === id) ?? mockUsers[0];

export const getRoom = (id: string) =>
  mockRooms.find((r) => r.id === id) ?? mockRooms[0];
