"use client";

import { useRef } from "react";
import { m, useScroll, useTransform } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "./motion/Reveal";
import { useMotionLevel, useSectionBg } from "./motion/useMotionLevel";

interface Step {
  n: string;
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: "1",
    icon: "health_and_safety",
    title: "Tell us how you feel",
    body: "Tap what hurts. Pick how bad it is. No long forms.",
  },
  {
    n: "2",
    icon: "search",
    title: "We find your doctor",
    body: "We match your symptoms to doctors who treat them.",
  },
  {
    n: "3",
    icon: "calendar_month",
    title: "Ask for a visit",
    body: "Pick a time. The doctor says yes. You pay only then.",
  },
];

export function HowItWorks() {
  const level = useMotionLevel();
  const bg = useSectionBg("bg-primary");
  const ref = useRef<HTMLDivElement>(null);

  // Progress through the pinned section, 0 at entry to 1 at exit.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Effect E: the centre line draws downward as the section is scrolled.
  const lineScale = useTransform(scrollYProgress, [0, 0.85], [0, 1]);

  // Mobile and reduced-motion: plain stacked cards, no pinning.
  if (level !== "full") {
    return (
      <section className={`px-6 py-24 text-on-primary ${bg}`}>
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
          <Reveal>
            <h2 className="text-headline-lg font-extrabold">How it works</h2>
          </Reveal>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <article className="flex flex-col gap-3 rounded-[24px] bg-warm-white/10 p-6">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-warm-white text-primary">
                  <Icon name={s.icon} fill className="text-[28px]" />
                </span>
                <span className="text-label-sm font-extrabold uppercase tracking-wide text-on-primary/70">
                  Step {s.n}
                </span>
                <h3 className="text-headline-md font-extrabold">{s.title}</h3>
                <p className="text-body-md text-on-primary/85">{s.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  // Desktop: the section is 300vh tall and its inner panel sticks, so scrolling
  // advances the steps in place.
  return (
    <section ref={ref} className={`relative h-[300vh] text-on-primary ${bg}`}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-16">
        <div className="mx-auto w-full max-w-[1080px]">
          <h2 className="mb-14 text-headline-lg font-extrabold">How it works</h2>

          <div className="relative">
            {/* Effect E: centre rule that draws downward */}
            <m.div
              aria-hidden
              className="absolute left-1/2 top-0 h-full w-[2px] origin-top -translate-x-1/2 bg-warm-white/40"
              style={{ scaleY: lineScale }}
            />

            <div className="flex flex-col gap-16">
              {STEPS.map((s, i) => (
                <StepRow key={s.n} step={s} index={i} progress={scrollYProgress} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepRow({
  step,
  index,
  progress,
}: {
  step: Step;
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // Each step activates over its own third of the section's scroll.
  const start = index * 0.3;
  const opacity = useTransform(progress, [start, start + 0.15], [0.35, 1]);
  // Effect G: the numeral scales up as its step becomes active.
  const numeralScale = useTransform(progress, [start, start + 0.15], [0.8, 1]);

  const alignRight = index % 2 === 1;

  return (
    <m.div
      style={{ opacity }}
      className={`flex w-full items-center gap-8 ${alignRight ? "flex-row-reverse" : ""}`}
    >
      <div className={`w-[calc(50%-3rem)] ${alignRight ? "text-left" : "text-right"}`}>
        <span className="text-label-sm font-extrabold uppercase tracking-wide text-on-primary/70">
          Step {step.n}
        </span>
        <h3 className="text-headline-md font-extrabold">{step.title}</h3>
        <p className="mt-2 text-body-md text-on-primary/85">{step.body}</p>
      </div>

      <m.span
        style={{ scale: numeralScale }}
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-warm-white text-primary"
      >
        <Icon name={step.icon} fill className="text-[30px]" />
      </m.span>

      <div className="w-[calc(50%-3rem)]" />
    </m.div>
  );
}
