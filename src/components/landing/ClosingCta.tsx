"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "./motion/Reveal";
import { useSectionBg } from "./motion/useMotionLevel";

export function ClosingCta() {
  const bg = useSectionBg("bg-sand");

  return (
    <section className={`relative overflow-hidden px-6 pb-32 pt-20 text-ink md:px-16 ${bg}`}>
      <Reveal
        weight="heavy"
        className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-6 rounded-[32px] border border-border bg-warm-white px-8 py-14 text-center shadow-card md:px-14"
      >
        {/* Tonal separation: Trust sits on sand, this sits on a raised
            warm-white slab. Two warm sections stop reading as one flat expanse,
            and it works at every motion level because it is a real element
            rather than a section background the colour arc would override. */}
        <h2 className="text-headline-lg font-extrabold">Ready when you are.</h2>
        <p className="text-body-lg text-ink-muted">
          Tell us how you feel. It only takes a minute.
        </p>
        <Link
          href="/register"
          className="inline-flex h-16 items-center justify-center gap-2 rounded-full bg-primary px-10 text-body-lg font-extrabold text-on-primary shadow-card transition-colors hover:bg-primary-container"
        >
          Get started <Icon name="arrow_forward" />
        </Link>
      </Reveal>
    </section>
  );
}
