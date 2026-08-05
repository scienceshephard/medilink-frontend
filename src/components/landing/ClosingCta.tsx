"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "./motion/Reveal";
import { useSectionBg } from "./motion/useMotionLevel";

export function ClosingCta() {
  const bg = useSectionBg("bg-sand");

  return (
    <section className={`px-6 pb-32 pt-20 text-ink md:px-16 ${bg}`}>
      <Reveal className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-6 text-center">
        <h2 className="text-headline-lg font-extrabold">Ready when you are.</h2>
        <p className="text-body-lg text-ink-muted">
          Tell us how you feel. It only takes a minute.
        </p>
        <Link
          href="/register"
          className="inline-flex h-16 items-center justify-center gap-2 rounded-full bg-primary px-10 text-body-lg font-extrabold text-on-primary transition-colors hover:bg-primary-container"
        >
          Get started <Icon name="arrow_forward" />
        </Link>
      </Reveal>
    </section>
  );
}
