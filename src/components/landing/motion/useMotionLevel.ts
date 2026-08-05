"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type MotionLevel = "off" | "lite" | "full";

/**
 * `useLayoutEffect` warns when it runs on the server, so fall back to
 * `useEffect` there. On the client we need the layout variant specifically —
 * see the comment in `useMotionLevel`.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * The single authority on whether motion runs. Every effect reads this.
 *
 * Starts at "off" on the server AND on the first client render, so the static
 * HTML is fully visible (crawlable, and correct if JS never loads) and
 * hydration matches exactly. It is then promoted in a LAYOUT effect, which
 * runs before the browser paints — if this were a passive effect the user
 * would see content appear, snap to invisible, then animate in.
 */
export function useMotionLevel(): MotionLevel {
  const prefersReduced = useReducedMotion();
  const [level, setLevel] = useState<MotionLevel>("off");

  useIsomorphicLayoutEffect(() => {
    if (prefersReduced) {
      setLevel("off");
      return;
    }
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setLevel(mq.matches ? "full" : "lite");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [prefersReduced]);

  return level;
}

/**
 * Background class for a section.
 *
 * In "full" the fixed `ColorArc` backdrop paints the page, so sections must be
 * transparent or they would cover it. Otherwise each section paints itself.
 */
export function useSectionBg(fallback: string): string {
  return useMotionLevel() === "full" ? "bg-transparent" : fallback;
}
