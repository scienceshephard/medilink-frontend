"use client";

import { useRef } from "react";
import { m, useScroll, useTransform } from "framer-motion";
import { Reveal } from "./motion/Reveal";
import { useMotionLevel, useSectionBg } from "./motion/useMotionLevel";

const NODES = ["You visit", "You tell us", "We learn", "Better match"];

export function OutcomeLoop() {
  const level = useMotionLevel();
  const bg = useSectionBg("bg-primary");
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 40%"],
  });

  // Effect F: the ring draws itself as the section passes through the viewport.
  const ringLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={ref} className={`px-6 py-28 text-on-primary md:px-16 md:py-36 ${bg}`}>
      <div className="mx-auto grid w-full max-w-[1080px] items-center gap-12 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Reveal>
            <h2 className="text-headline-lg font-extrabold leading-tight">
              We learn who actually makes people better.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-body-lg text-on-primary/85">
              After your visit we ask one thing: are you better, the same, or worse? That answer
              teaches our matching — so the next person gets a better doctor than you did.
            </p>
          </Reveal>
        </div>

        <div className="flex justify-center">
          <svg viewBox="0 0 240 240" className="h-64 w-64 md:h-80 md:w-80" role="img"
               aria-label="A loop: you visit, you tell us how you are, we learn, the next match improves.">
            {level === "full" ? (
              <m.circle
                cx="120" cy="120" r="92" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className="text-warm-white/70"
                style={{ pathLength: ringLength }}
                transform="rotate(-90 120 120)"
              />
            ) : (
              <circle cx="120" cy="120" r="92" fill="none" stroke="currentColor"
                      strokeWidth="2" className="text-warm-white/70" />
            )}
            {NODES.map((label, i) => {
              const angle = (i / NODES.length) * 2 * Math.PI - Math.PI / 2;
              const x = 120 + 92 * Math.cos(angle);
              const y = 120 + 92 * Math.sin(angle);
              return (
                <g key={label}>
                  <circle cx={x} cy={y} r="8" className="fill-warm-white" />
                  <text
                    x={x} y={y - 16} textAnchor="middle"
                    className="fill-warm-white text-[11px] font-bold"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
