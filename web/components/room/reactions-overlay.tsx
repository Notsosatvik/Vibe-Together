"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Reaction = { id: number; emoji: string; left: number };

const POOL = ["🔥", "✨", "💜", "🎧", "🚀", "💀", "👀", "🫶"];

export function ReactionsOverlay({ trigger }: { trigger: number }) {
  const [items, setItems] = useState<Reaction[]>([]);
  const [tickId, setTickId] = useState(0);

  // Burst whenever the trigger prop changes
  useEffect(() => {
    if (trigger === 0) return;
    const burst: Reaction[] = Array.from({ length: 6 }).map((_, i) => ({
      id: tickId * 10 + i,
      emoji: POOL[Math.floor(Math.random() * POOL.length)],
      left: 10 + Math.random() * 80,
    }));
    setItems((prev) => [...prev, ...burst]);
    setTickId((t) => t + 1);

    const cleanup = setTimeout(() => {
      setItems((prev) => prev.slice(burst.length));
    }, 2500);
    return () => clearTimeout(cleanup);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {items.map((r) => (
          <motion.span
            key={r.id}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -300, opacity: [0, 1, 1, 0], scale: [0.6, 1.4, 1.1, 0.9] }}
            transition={{ duration: 2.4, ease: "easeOut" }}
            style={{ left: `${r.left}%`, bottom: "10%", position: "absolute" }}
            className="text-3xl drop-shadow-[0_0_14px_rgba(255,255,255,0.4)]"
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
