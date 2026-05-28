"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Lightweight CSS-only audio visualizer — deterministic per bar so SSR matches client.
export function Visualizer({
  bars = 36,
  className,
  intense = false,
}: {
  bars?: number;
  className?: string;
  intense?: boolean;
}) {
  // Re-render every ~120ms to update heights. Cheap because we only update state.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "flex items-end gap-[3px] h-12 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        // Pseudo-random but deterministic on tick+i so it animates smoothly
        const seed = Math.sin(tick * 0.5 + i * 1.3) * 0.5 + 0.5;
        const env = Math.sin((i / bars) * Math.PI); // bell-curve envelope
        const h = 8 + seed * env * (intense ? 56 : 40);
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-neon-green via-neon-blue to-neon-purple transition-[height] duration-150 ease-out"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}
