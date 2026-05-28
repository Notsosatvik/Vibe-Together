import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { BackgroundFX } from "@/components/shared/background-fx";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundFX />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between p-6">
        <Link href="/">
          <Logo />
        </Link>
        <Link
          href="/"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to site
        </Link>
      </header>
      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
