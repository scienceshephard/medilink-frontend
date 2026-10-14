"use client";

import Link from "next/link";
import { m, useScroll, useSpring, useTransform } from "framer-motion";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { GhostType } from "./GhostType";
import { useMotionLevel, useSectionBg } from "./motion/useMotionLevel";
import { riseVariants, SCROLL_SPRING, staggerParent } from "./motion/variants";

const HEADLINE = ["Feel", "better,", "faster."];

export function Hero() {
  const level = useMotionLevel();
  const bg = useSectionBg("bg-ink");
  const { scrollYProgress } = useScroll();

  // Effect B: the ghost type drifts up and fades as the hero scrolls away.
  // Sprung so it trails the scroll slightly — the drift reads as the type
  // having weight rather than being pinned to the scrollbar.
  const progress = useSpring(scrollYProgress, SCROLL_SPRING);
  const driftY = useTransform(progress, [0, 0.18], [0, -80]);
  const driftOpacity = useTransform(progress, [0, 0.14], [0.18, 0]);

  const animated = level !== "off";

  return (
    <section
      className={`relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-20 text-warm-white md:px-16 ${bg}`}
    >
      {/* Effect L + B: ghost mega-type backdrop */}
      {level === "full" ? (
        <m.div
          className="absolute inset-x-0 top-1/4 flex justify-center"
          style={{ y: driftY, opacity: driftOpacity }}
        >
          <GhostType text="FEEL BETTER" className="text-[18vw] text-warm-white" />
        </m.div>
      ) : (
        <div className="absolute inset-x-0 top-1/4 flex justify-center opacity-[0.14]">
          <GhostType text="FEEL BETTER" className="text-[22vw] text-warm-white" />
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-[1080px] flex-col gap-7">
        <span className="inline-flex items-center gap-2 font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary">
            <SvgIcon name="favorite" fill />
          </span>
          <span className="text-headline-md tracking-tight">MediLink</span>
        </span>

        {/* Effect A: words rise in sequence */}
        {animated ? (
          <m.h1
            className="flex flex-wrap gap-x-4 text-display-lg font-extrabold leading-tight"
            variants={staggerParent}
            initial="hidden"
            animate="visible"
          >
            {HEADLINE.map((word) => (
              <m.span key={word} variants={riseVariants}>
                {word}
              </m.span>
            ))}
          </m.h1>
        ) : (
          <h1 className="text-display-lg font-extrabold leading-tight">
            {HEADLINE.join(" ")}
          </h1>
        )}

        <p className="max-w-md text-body-lg text-warm-white/80">
          Tell us how you feel. We&apos;ll help you find a clinician to contact.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/register"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-body-lg font-extrabold text-on-primary transition-colors hover:bg-primary-container"
          >
            Get started <SvgIcon name="arrow_forward" />
          </Link>
          <Link href="/login" className="font-bold text-warm-white/70">
            Already have an account? <span className="font-extrabold text-warm-white">Log in</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
