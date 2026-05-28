import { cn } from "@/lib/utils";

// Stylized "album art" — gradients + a generated geometric pattern.
// Renders the same shapes for the same trackId so it feels stable.
export function AlbumArt({
  gradient,
  seed = "",
  className,
  rounded = "rounded-2xl",
}: {
  gradient: string; // tailwind gradient classes (e.g. "from-purple-600 via-fuchsia-500 to-rose-500")
  seed?: string;
  className?: string;
  rounded?: string;
}) {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = (hash * 37) % 360;
  const a = hash % 100;
  const b = (hash * 13) % 100;

  return (
    <div
      className={cn(
        "relative overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]",
        rounded,
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
      <div
        className="absolute inset-0 mix-blend-overlay opacity-70"
        style={{
          background: `conic-gradient(from ${angle}deg at ${a}% ${b}%, rgba(255,255,255,0.6), transparent 30%, rgba(0,0,0,0.5), transparent 70%, rgba(255,255,255,0.5))`,
        }}
      />
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-60"
        style={{
          background: `radial-gradient(circle at ${a}% ${100 - b}%, white, transparent 45%)`,
        }}
      />
      <div className="absolute inset-0 noise opacity-30 mix-blend-overlay" />
    </div>
  );
}
