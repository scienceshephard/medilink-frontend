import type { Transition, Variants } from "framer-motion";

/**
 * Motion vocabulary.
 *
 * Earlier this file held a single easing curve and a single duration applied to
 * every element on the page. That read as mechanical: the headline, a caption
 * and a card all entered identically, so nothing had weight. Motion now varies
 * along one axis — how heavy a thing is — while staying one coherent system.
 */

/** Retained for the few places that genuinely want a fixed-duration tween. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = { fast: 0.35, base: 0.55, slow: 0.9 } as const;

/** Delay between staggered children. */
export const STAGGER = 0.08;

/**
 * Springs, tuned by the visual weight of what they move.
 *
 * Heavier things resist and settle slowly; light things arrive quickly and stop.
 * Damping stays high enough that nothing wobbles — this is a health product,
 * not a toy.
 */
export const SPRING = {
  /** Large type and section headings. Has a little follow-through. */
  heavy: { type: "spring", stiffness: 90, damping: 18, mass: 1.1 },
  /** Default: body copy, cards, most entrances. */
  base: { type: "spring", stiffness: 140, damping: 20, mass: 0.9 },
  /** Captions, chips, small labels. Arrives and stops. */
  light: { type: "spring", stiffness: 260, damping: 26, mass: 0.6 },
} satisfies Record<string, Transition>;

export type Weight = keyof typeof SPRING;

/** Kept for callers that still want the old fixed tween. */
export const baseTransition: Transition = { duration: DURATION.base, ease: EASE };

/** Fade + rise. The page's default entrance. */
export const riseVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING.base },
};

/**
 * Entrance that also carries a direction.
 *
 * Used by the zig-zag timeline, where each step should arrive from the side it
 * lives on — motion that agrees with the layout rather than ignoring it.
 */
export function riseFrom(weight: Weight = "base", x = 0, y = 20): Variants {
  return {
    hidden: { opacity: 0, x, y },
    visible: { opacity: 1, x: 0, y: 0, transition: SPRING[weight] },
  };
}

/** Parent that staggers its children. */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER } },
};

/**
 * Smoothing for scroll-linked values.
 *
 * A raw scroll transform tracks the wheel exactly, which is what makes
 * scroll animation feel rigid and machine-driven. Passing the value through a
 * spring lets it lag a fraction and settle, so the page feels like it has
 * mass. Used by the colour arc, the hero drift and the timeline.
 */
export const SCROLL_SPRING = { stiffness: 120, damping: 30, restDelta: 0.001 } as const;
