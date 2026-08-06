"use client";

import { SvgIcon, type SvgIconName } from "@/components/ui/SvgIcon";
import { GhostType } from "./GhostType";
import { Reveal } from "./motion/Reveal";
import { useOpaqueSectionBg } from "./motion/useMotionLevel";

/** Every claim here is verifiable against the app's actual behaviour. */
const CLAIMS: [SvgIconName, string, string][] = [
  ["verified", "Checked by hand", "An admin verifies every doctor before they can be matched."],
  ["star", "Real ratings", "Only from patients who finished a visit."],
  ["payments", "Pay after they say yes", "Asking is free. You pay only when a doctor accepts."],
];

export function Trust() {
  const bg = useOpaqueSectionBg("bg-sand");

  return (
    <section className={`relative overflow-hidden px-6 py-28 text-ink md:px-16 md:py-36 ${bg}`}>
      {/* Shape: the warm half gets the same ghost-type device as the ink half,
          in terracotta, so the page reads as one language top to bottom. */}
      <div className="absolute inset-x-0 top-6 flex justify-start opacity-[0.07] md:top-10">
        <GhostType text="REAL CARE" className="text-[15vw] text-primary" />
      </div>

      {/* Shape: a terracotta rule anchoring the section to the warm palette. */}
      <div aria-hidden className="absolute left-0 top-0 h-1.5 w-40 bg-primary md:w-64" />

      <div className="relative mx-auto flex w-full max-w-[1080px] flex-col gap-10">
        <Reveal weight="heavy">
          <h2 className="text-headline-lg font-extrabold">Real doctors. Checked by hand.</h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {CLAIMS.map(([icon, title, body], i) => (
            <Reveal key={title} delay={i * 0.08} weight="base" fromX={0}>
              {/* Shadow: `shadow-card` is a Warm Care token that this page had
                  never used. Without it a warm-white card on sand has almost no
                  edge, and the whole section reads flat. */}
              <article className="flex h-full flex-col gap-3 rounded-[24px] border border-border bg-warm-white p-6 shadow-card transition-shadow duration-300 hover:shadow-modal">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
                  <SvgIcon name={icon} fill />
                </span>
                <h3 className="text-headline-md font-extrabold">{title}</h3>
                <p className="text-body-md text-ink-muted">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
