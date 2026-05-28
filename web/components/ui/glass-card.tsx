import * as React from "react";
import { cn } from "@/lib/utils";

export const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { strong?: boolean; bordered?: boolean }
>(({ className, strong, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        strong ? "glass-strong" : "glass",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
GlassCard.displayName = "GlassCard";
