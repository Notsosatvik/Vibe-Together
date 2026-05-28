"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Live Demo" },
  { href: "#testimonials", label: "Loved by" },
  { href: "/discover", label: "Discover" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "py-2" : "py-4"
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <nav
          className={cn(
            "flex h-14 items-center justify-between rounded-full px-3 pr-2 transition-all",
            scrolled
              ? "glass-strong shadow-[0_10px_40px_-20px_rgba(0,0,0,0.7)]"
              : "bg-transparent border border-transparent"
          )}
        >
          <Link href="/" className="pl-2">
            <Logo />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="!h-9">
                Get the vibe
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
