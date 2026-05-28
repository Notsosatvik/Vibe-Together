"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Visualizer } from "@/components/shared/visualizer";

export function CTA() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[32px] shiny-border p-10 sm:p-16 text-center"
        >
          <div className="absolute inset-0 bg-brand-soft" />
          <div className="absolute -inset-32 -z-10 bg-brand-gradient opacity-20 blur-3xl" />

          <div className="relative">
            <Visualizer className="mx-auto h-12 w-72" intense />
            <h2 className="mt-8 font-display text-4xl sm:text-6xl font-semibold tracking-tight">
              Your next favorite song
              <br />
              <span className="text-gradient">deserves an audience.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/70 text-lg">
              Start a free listening room in 9 seconds. No credit card, no app to install.
              Just sign in with Google, connect Spotify, and press play together.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg">Start a room — it's free</Button>
              </Link>
              <Link href="/discover">
                <Button size="lg" variant="secondary">
                  Browse public rooms
                </Button>
              </Link>
            </div>
            <div className="mt-6 text-xs text-white/40">
              Spotify Premium required for listeners. We never modify your account.
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
