"use client";

import { m } from "framer-motion";
import { useMotionLevel } from "./useMotionLevel";
import { riseFrom, SPRING, type Weight } from "./variants";

/**
 * Fade-and-rise on first entry into the viewport.
 *
 * `weight` picks how heavy the movement feels — headings should arrive with
 * more follow-through than a caption. `fromX` lets a section give its entrance
 * a direction that agrees with its layout.
 *
 * At level "off" it renders a plain div with no transform and no hidden
 * initial state — this is what keeps the no-JS render fully visible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  weight = "base",
  fromX = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  weight?: Weight;
  fromX?: number;
}) {
  const level = useMotionLevel();

  if (level === "off") return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      variants={riseFrom(weight, fromX)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ ...SPRING[weight], delay }}
    >
      {children}
    </m.div>
  );
}
