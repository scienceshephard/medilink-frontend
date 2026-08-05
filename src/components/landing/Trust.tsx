"use client";

import { Icon } from "@/components/ui/Icon";
import { Reveal } from "./motion/Reveal";
import { useSectionBg } from "./motion/useMotionLevel";

/** Every claim here is verifiable against the app's actual behaviour. */
const CLAIMS: [string, string, string][] = [
  ["verified", "Checked by hand", "An admin verifies every doctor before they can be matched."],
  ["star", "Real ratings", "Only from patients who finished a visit."],
  ["payments", "Pay after they say yes", "Asking is free. You pay only when a doctor accepts."],
];

export function Trust() {
  const bg = useSectionBg("bg-sand");

  return (
    <section className={`px-6 py-28 text-ink md:px-16 md:py-36 ${bg}`}>
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-10">
        <Reveal>
          <h2 className="text-headline-lg font-extrabold">Real doctors. Checked by hand.</h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {CLAIMS.map(([icon, title, body], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <article className="flex h-full flex-col gap-3 rounded-[24px] border border-border bg-warm-white p-6">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon name={icon} fill />
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
