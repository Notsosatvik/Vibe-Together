"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/store/user";

/**
 * Loads /users/me into the user store on mount.
 * Returns the live store state.
 */
export function useMe() {
  const status = useUserStore((s) => s.status);
  const user = useUserStore((s) => s.user);
  const loadMe = useUserStore((s) => s.loadMe);

  useEffect(() => {
    if (status === "idle") void loadMe();
  }, [status, loadMe]);

  return { user, status };
}
