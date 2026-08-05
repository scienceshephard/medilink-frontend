"use client";

import { GhostType } from "./GhostType";
import { Reveal } from "./motion/Reveal";
import { useSectionBg } from "./motion/useMotionLevel";

export function Problem() {
  const bg = useSectionBg("bg-ink");

  return (
    <section className={`relative overflow-hidden px-6 py-28 text-warm-white md:px-16 md:py-40 ${bg}`}>
      <div className="absolute inset-x-0 bottom-8 flex justify-end opacity-[0.10] md:bottom-16">
        <GhostType text="GUESSWORK" className="text-[16vw] text-warm-white" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1080px] flex-col gap-6">
        <Reveal>
          <h2 className="max-w-2xl text-headline-lg font-extrabold leading-tight">
            You shouldn&apos;t have to guess.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-xl text-body-lg text-warm-white/75">
            Most people pick a doctor from a list of names they don&apos;t know. That&apos;s backwards.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
