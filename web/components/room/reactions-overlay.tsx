"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FloatingReaction = { id: number; emoji: string; left: number };

/**
 * Floating-emoji overlay. Every time the parent's `event` prop changes (i.e.
 * `event.id` increments), one emoji spawns at a random horizontal position
 * and drifts upward.
 *
 * Events come from two sources in room-player.tsx:
 *   1. The local user clicking a button in the ReactionBar (instant feedback)
 *   2. The socket `reaction:fire` broadcast (other users' reactions)
 *
 * Position is `absolute inset-0`, so the parent MUST be `position: relative`
 * (otherwise the overlay escapes to the viewport and you get emojis flying
 * across the whole page — funny once, bad for usability).
 */
export function ReactionsOverlay({
  event,
}: {
  event: { id: number; emoji: string } | null;
}) {
  const [items, setItems] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (!event) return;
    // Spawn a new floating emoji. We don't replace the existing list — multiple
    // people firing 🔥 at the same time should produce multiple emojis.
    const next: FloatingReaction = {
      id: event.id,
      emoji: event.emoji,
      // Stay in the middle 70% so emojis don't get clipped by the rounded
      // card corners on either side.
      left: 15 + Math.random() * 70,
    };
    setItems((prev) => [...prev, next]);

    // Animation runs 2.4s — give a little extra time before removing from DOM
    // so AnimatePresence can fade it out.
    const timer = window.setTimeout(() => {
      setItems((prev) => prev.filter((r) => r.id !== next.id));
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [event]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {items.map((r) => (
          <motion.span
            key={r.id}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{
              y: -240,
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.4, 1.1, 0.9],
            }}
            transition={{ duration: 2.4, ease: "easeOut" }}
            style={{ left: `${r.left}%`, bottom: "10%", position: "absolute" }}
            className="text-3xl drop-shadow-[0_0_14px_rgba(255,255,255,0.4)] select-none"
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
