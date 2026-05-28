import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <LandingNav />
      <main className="relative">{children}</main>
      <LandingFooter />
    </div>
  );
}
