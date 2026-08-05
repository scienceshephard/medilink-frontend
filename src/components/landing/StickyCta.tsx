"use client";

import Link from "next/link";
import { m, useScroll, useTransform } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { useMotionLevel } from "./motion/useMotionLevel";

/**
 * Compact CTA that slides in once the hero has scrolled past.
 * At level "off" it is not rendered at all — the inline CTAs in the hero and
 * closing section are sufficient, and a fixed bar would only obstruct.
 */
export function StickyCta() {
  const level = useMotionLevel();
  const { scrollYProgress } = useScroll();

  const y = useTransform(scrollYProgress, [0.12, 0.2], [80, 0]);
  const opacity = useTransform(scrollYProgress, [0.12, 0.2, 0.92, 0.97], [0, 1, 1, 0]);

  if (level === "off") return null;

  return (
    <m.div
      style={{ y, opacity }}
      className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2"
    >
      <Link
        href="/register"
        className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-7 font-extrabold text-on-primary shadow-modal transition-colors hover:bg-primary-container"
      >
        Get started <Icon name="arrow_forward" />
      </Link>
    </m.div>
  );
}
