"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/hooks/use-me";
import { Logo } from "@/components/shared/logo";

/**
 * Wraps protected app routes. Fetches /users/me, redirects to /login
 * on 401, and shows a quiet branded splash while we resolve the session.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, status } = useMe();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "authenticated" && user) return <>{children}</>;

  return (
    <div className="min-h-screen w-full grid place-items-center">
      <div className="flex flex-col items-center gap-4 opacity-80">
        <Logo />
        <div className="text-xs uppercase tracking-wider text-white/40">
          Tuning in…
        </div>
      </div>
    </div>
  );
}
