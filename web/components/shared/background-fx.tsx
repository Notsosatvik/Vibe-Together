"use client";

import { cn } from "@/lib/utils";

// Floating ambient gradients used behind hero and dashboard sections.
export function BackgroundFX({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "room";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {variant === "default" && (
        <>
          <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-neon-purple/30 blur-[120px] animate-pulse-glow" />
          <div className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-neon-blue/25 blur-[140px] animate-pulse-glow [animation-delay:1.5s]" />
          <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-neon-green/20 blur-[120px] animate-pulse-glow [animation-delay:3s]" />
          <div className="absolute inset-0 bg-grid" />
          <div className="absolute inset-0 noise opacity-[0.06] mix-blend-overlay" />
        </>
      )}

      {variant === "room" && (
        <>
          <div className="absolute -top-16 left-1/4 h-[500px] w-[500px] rounded-full bg-neon-purple/30 blur-[140px] animate-float-slower" />
          <div className="absolute bottom-0 -right-24 h-[440px] w-[440px] rounded-full bg-neon-blue/25 blur-[140px] animate-float-slow" />
          <div className="absolute top-1/3 -left-20 h-[360px] w-[360px] rounded-full bg-neon-green/15 blur-[120px] animate-float-slower [animation-delay:2s]" />
          <div className="absolute inset-0 noise opacity-[0.08] mix-blend-overlay" />
        </>
      )}
    </div>
  );
}
