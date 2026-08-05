import type { Transition, Variants } from "framer-motion";

/** One easing curve for the entire page, so twelve effects read as one system. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = { fast: 0.35, base: 0.55, slow: 0.9 } as const;

/** Delay between staggered children. */
export const STAGGER = 0.08;

export const baseTransition: Transition = { duration: DURATION.base, ease: EASE };

/** Fade + rise. The page's default entrance. */
export const riseVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

/** Parent that staggers `riseVariants` children. */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER } },
};
