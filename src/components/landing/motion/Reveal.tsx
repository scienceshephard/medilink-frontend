"use client";

import { m } from "framer-motion";
import { useMotionLevel } from "./useMotionLevel";
import { baseTransition, riseVariants } from "./variants";

/**
 * Fade-and-rise on first entry into the viewport.
 *
 * At level "off" it renders a plain div with no transform and no hidden
 * initial state — this is what keeps the no-JS render fully visible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const level = useMotionLevel();

  if (level === "off") return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      variants={riseVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ ...baseTransition, delay }}
    >
      {children}
    </m.div>
  );
}
