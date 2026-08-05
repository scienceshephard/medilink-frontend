"use client";

import { m, useScroll, useSpring, useTransform } from "framer-motion";
import { useMotionLevel } from "./motion/useMotionLevel";
import { SCROLL_SPRING } from "./motion/variants";

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
  //
  // The raw scroll value is passed through a spring so the colour lags the
  // wheel slightly and settles, instead of being welded to scroll position.
  // That lag is most of what makes the arc feel like a change in weather
  // rather than a slider being dragged.
  const progress = useSpring(scrollYProgress, SCROLL_SPRING);

  // Stops are derived from MEASURED section geometry, not guessed. The pinned
  // timeline is 300vh and alone occupies 53% of the page, which skews page
  // progress heavily — earlier guessed values turned the background sand while
  // the timeline and outcome sections (both white-on-terracotta) were still on
  // screen, leaving their text nearly invisible.
  //
  //   hero + problem   0.000 - 0.264   white on ink
  //   how-it-works     0.288 - 0.815   white on terracotta
  //   outcome          0.815 - 0.936   white on terracotta
  //   trust + start    0.960 - end     ink on sand
  //
  // Each ramp therefore completes before the section that needs that colour
  // begins, and never crosses a section whose foreground assumes the other.
  const terracottaOpacity = useTransform(progress, [0.20, 0.285], [0, 1]);
  const sandOpacity = useTransform(progress, [0.93, 0.965], [0, 1]);

  if (level !== "full") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-ink" />
      <m.div className="absolute inset-0 bg-primary" style={{ opacity: terracottaOpacity }} />
      <m.div className="absolute inset-0 bg-sand" style={{ opacity: sandOpacity }} />
    </div>
  );
}
