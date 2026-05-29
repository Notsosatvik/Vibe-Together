import { cn, initialsOf } from "@/lib/utils";

export function Avatar({
  name,
  color = "from-neon-green to-neon-blue",
  size = 36,
  ring,
  status,
  className,
  imageUrl,
}: {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
  status?: "listening" | "idle" | "offline";
  className?: string;
  /** Optional avatar image URL — Google profile pic, etc. Falls back to initials gradient. */
  imageUrl?: string;
}) {
  const statusColor =
    status === "listening"
      ? "bg-neon-green shadow-[0_0_10px_rgba(29,245,164,0.9)]"
      : status === "idle"
      ? "bg-amber-400"
      : "bg-white/30";

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full overflow-hidden",
          ring && "ring-2 ring-white/15 ring-offset-2 ring-offset-ink-900"
        )}
      >
        <span className={cn("absolute inset-0 rounded-full bg-gradient-to-br", color)} />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ fontSize: Math.max(10, size * 0.38) }}
          >
            {initialsOf(name)}
          </span>
        )}
      </span>
      {status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-[2.5px] border-ink-900",
            statusColor
          )}
          style={{
            width: Math.max(8, size * 0.28),
            height: Math.max(8, size * 0.28),
          }}
        />
      )}
    </span>
  );
}
