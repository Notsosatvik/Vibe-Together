"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LYRICS = [
  { t: 0, line: "Headlights on the highway" },
  { t: 6, line: "Empty roads to disappear on" },
  { t: 12, line: "Midnight blue and rising" },
  { t: 18, line: "Your voice through the static" },
  { t: 26, line: "Drive me home" },
  { t: 32, line: "Drive me home tonight" },
  { t: 40, line: "Through the neon and the rain" },
  { t: 48, line: "We were never meant to wait" },
  { t: 56, line: "Drive me home" },
  { t: 64, line: "Drive me home tonight" },
  { t: 72, line: "City lights stretched out forever" },
  { t: 80, line: "I keep losing track of time" },
];

export function Lyrics({ progressSec }: { progressSec: number }) {
  const activeIdx = LYRICS.findIndex(
    (l, i) => l.t <= progressSec && (i === LYRICS.length - 1 || LYRICS[i + 1].t > progressSec)
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  return (
    <div className="relative h-full">
      <div
        ref={ref}
        className="h-full overflow-y-auto px-1 py-6 no-scrollbar [mask-image:linear-gradient(180deg,transparent,#000_15%,#000_85%,transparent)]"
      >
        <ul className="space-y-3.5 text-center">
          {LYRICS.map((l, i) => {
            const isActive = i === activeIdx;
            const distance = Math.abs(i - activeIdx);
            return (
              <li
                key={i}
                data-idx={i}
                className={cn(
                  "text-2xl sm:text-3xl font-display font-semibold tracking-tight transition-all duration-500",
                  isActive
                    ? "text-white scale-[1.04]"
                    : distance === 1
                    ? "text-white/55"
                    : "text-white/25"
                )}
              >
                {l.line}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
