import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className="relative inline-flex items-center justify-center rounded-xl shadow-glow"
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-0 rounded-xl bg-brand-gradient" />
        <span className="absolute inset-[2px] rounded-[10px] bg-ink-950" />
        <svg
          viewBox="0 0 24 24"
          width={size * 0.55}
          height={size * 0.55}
          className="relative z-10"
          fill="none"
          stroke="url(#vg)"
          strokeLinecap="round"
          strokeWidth={2.4}
        >
          <defs>
            <linearGradient id="vg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1DF5A4" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          <path d="M3 12c2 0 2-5 4-5s2 10 4 10 2-13 4-13 2 8 4 8 2-3 2-3" />
        </svg>
      </span>
      <span
        className="font-display text-[15px] font-semibold tracking-tight"
        style={{ fontSize: Math.max(14, size * 0.55) }}
      >
        Vibe<span className="text-gradient">Together</span>
      </span>
    </div>
  );
}
