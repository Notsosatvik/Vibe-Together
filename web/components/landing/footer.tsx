import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Github, Twitter, Instagram } from "lucide-react";

const groups = [
  {
    label: "Product",
    items: [
      { href: "#features", label: "Features" },
      { href: "#demo", label: "Live Demo" },
      { href: "/discover", label: "Discover" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    label: "Listen",
    items: [
      { href: "/login", label: "Create a room" },
      { href: "/discover", label: "Browse rooms" },
      { href: "/profile", label: "Your profile" },
      { href: "/friends", label: "Friends activity" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "/about", label: "About" },
      { href: "/press", label: "Press kit" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Legal",
    items: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/spotify-disclosure", label: "Spotify disclosure" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="relative mt-12 border-t border-white/8">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-white/55">
              The world's most premium way to listen together. Built by people who refuse to
              be more than three minutes from a chorus they love.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <SocialLink href="https://twitter.com" icon={Twitter} />
              <SocialLink href="https://instagram.com" icon={Instagram} />
              <SocialLink href="https://github.com" icon={Github} />
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {g.label}
              </div>
              <ul className="mt-3 space-y-2">
                {g.items.map((i) => (
                  <li key={i.label}>
                    <Link
                      href={i.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 border-t border-white/6 pt-6 text-xs text-white/40">
          <div>© {new Date().getFullYear()} VibeTogether Labs. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
            All systems vibing
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  icon: Icon,
}: {
  href: string;
  icon: typeof Github;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}
