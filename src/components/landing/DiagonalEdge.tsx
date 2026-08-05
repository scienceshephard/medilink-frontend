"use client";

import { m } from "framer-motion";
import { useMotionLevel } from "./motion/useMotionLevel";
import { DURATION, EASE } from "./motion/variants";

/**
 * A diagonal colour wedge that bridges two sections — the reference site's
 * defining device, in Warm Care colours.
 *
 * `colorClass` should be the background of the section BELOW, so the wedge
 * reads as that section cutting up into this one. Animated with scaleX (a
 * compositor-friendly wipe); the clip-path itself is never animated.
 */
export function DiagonalEdge({
  colorClass,
  direction = "right",
  height = 120,
}: {
  colorClass: string;
  direction?: "left" | "right";
  height?: number;
}) {
  const level = useMotionLevel();

  const clipPath =
    direction === "right"
      ? "polygon(0 100%, 100% 0, 100% 100%)"
      : "polygon(0 0, 0 100%, 100% 100%)";

  const style = { height, clipPath };

  if (level === "off") {
    return <div aria-hidden className={`w-full ${colorClass}`} style={style} />;
  }

  return (
    <m.div
      aria-hidden
      className={`w-full origin-left ${colorClass}`}
      style={style}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: DURATION.slow, ease: EASE }}
    />
  );
}
