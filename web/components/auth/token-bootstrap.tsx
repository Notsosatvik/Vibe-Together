"use client";

import { useEffect } from "react";
import { bootstrapAuthFromHash } from "@/lib/api";

/**
 * Reads auth tokens from the URL fragment (set by the API's OAuth callback as
 * a fallback for browsers that block third-party cookies) into localStorage,
 * then strips the fragment so it doesn't sit in browser history.
 *
 * Mounted once at the root layout. Runs on every navigation but is a no-op
 * unless a fragment with `#a=...&r=...` is present.
 */
export function TokenBootstrap() {
  useEffect(() => {
    bootstrapAuthFromHash();
  }, []);
  return null;
}
