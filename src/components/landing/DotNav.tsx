"use client";

import { useEffect, useState } from "react";
import { useMotionLevel } from "./motion/useMotionLevel";

/**
 * Vertical dot indicator on the left edge, marking which section is in view.
 * Desktop only — at "lite"/"off" it returns null.
 */
export function DotNav({ sections }: { sections: readonly string[] }) {
  const level = useMotionLevel();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (level !== "full") return;
    const els = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = els.indexOf(entry.target as HTMLElement);
            if (i !== -1) setActive(i);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [level, sections]);

  if (level !== "full") return null;

  return (
    <nav
      aria-label="Page sections"
      className="fixed left-7 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3.5"
    >
      {sections.map((id, i) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={`Go to ${id.replace(/-/g, " ")}`}
          aria-current={i === active ? "true" : undefined}
          className={
            i === active
              ? "h-2.5 w-2.5 rounded-full bg-current opacity-100 transition-opacity"
              : "h-2.5 w-2.5 rounded-full bg-current opacity-35 transition-opacity hover:opacity-70"
          }
        />
      ))}
    </nav>
  );
}
