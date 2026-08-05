"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation } from "framer-motion";
import { useAuth, homeForRole } from "@/lib/auth";
import { ColorArc } from "@/components/landing/ColorArc";
import { DiagonalEdge } from "@/components/landing/DiagonalEdge";
import { DotNav } from "@/components/landing/DotNav";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { OutcomeLoop } from "@/components/landing/OutcomeLoop";
import { Trust } from "@/components/landing/Trust";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { StickyCta } from "@/components/landing/StickyCta";

const SECTION_IDS = ["hero", "problem", "how-it-works", "outcome", "trust", "start"] as const;

export default function Welcome() {
  const router = useRouter();
  const { role, ready } = useAuth();

  // Signed-in visitors are redirected AFTER render — returning null before it
  // would strip the page out of the prerendered HTML (see Task 2).
  useEffect(() => {
    if (ready && role) router.replace(homeForRole(role));
  }, [ready, role, router]);

  return (
    // `strict` makes a stray `motion` import throw instead of silently
    // shipping the full bundle.
    <LazyMotion features={domAnimation} strict>
      <ColorArc />
      <DotNav sections={SECTION_IDS} />

      <main className="relative">
        <div id="hero"><Hero /></div>
        <div id="problem"><Problem /></div>
        <DiagonalEdge colorClass="bg-primary" direction="right" />
        <div id="how-it-works"><HowItWorks /></div>
        <div id="outcome"><OutcomeLoop /></div>
        <DiagonalEdge colorClass="bg-sand" direction="left" />
        <div id="trust"><Trust /></div>
        <div id="start"><ClosingCta /></div>
      </main>

      <StickyCta />
    </LazyMotion>
  );
}
