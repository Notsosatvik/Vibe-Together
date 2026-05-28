import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { LiveDemo } from "@/components/landing/live-demo";
import { Testimonials } from "@/components/landing/testimonials";
import { CTA } from "@/components/landing/cta";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <LiveDemo />
      <Testimonials />
      <CTA />
    </>
  );
}
