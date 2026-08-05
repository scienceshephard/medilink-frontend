"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { activeHref, type NavItem } from "./navItems";

/**
 * Which nav item should be highlighted, fragment-aware.
 *
 * `usePathname()` deliberately excludes the hash, so nav items that differ only
 * by fragment are indistinguishable to it. Track the hash ourselves and let
 * `activeHref` pick exactly one winner.
 */
export function useActiveHref(items: NavItem[]): string | null {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync(); // also re-syncs after a route change, which clears the fragment
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  return activeHref(items, pathname, hash);
}
