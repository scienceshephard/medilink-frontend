"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { useMotionLevel } from "./motion/useMotionLevel";

/**
 * The page's cold-to-warm colour arc: ink (sections 1-2) → terracotta (3-4) →
 * sand (5-6). Rendered as three stacked fixed layers cross-faded by opacity,
 * never by animating background-color.
 *
 * Only active at level "full". At "lite"/"off" this returns null and each
 * section paints its own background via `useSectionBg`.
 */
export function ColorArc() {
  const level = useMotionLevel();
  const { scrollYProgress } = useScroll();

  // Hooks must run unconditionally, so these are declared before the early return.
  const terracottaOpacity = useTransform(scrollYProgress, [0.22, 0.45], [0, 1]);
  const sandOpacity = useTransform(scrollYProgress, [0.58, 0.78], [0, 1]);

  if (level !== "full") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-ink" />
      <m.div className="absolute inset-0 bg-primary" style={{ opacity: terracottaOpacity }} />
      <m.div className="absolute inset-0 bg-sand" style={{ opacity: sandOpacity }} />
    </div>
  );
}
