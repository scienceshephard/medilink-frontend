"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColdStartBanner } from "@/components/app/ColdStartBanner";
import { HeroMatchCard, CompactMatchCard } from "@/components/app/MatchCard";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadRecommendation } from "@/lib/recommendations";
import type { RecommendationResponse } from "@/lib/types";

export default function RecommendationsPage() {
  const [rec, setRec] = useState<RecommendationResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRecommendation().then((r) => {
      if (cancelled) return;
      setRec(r);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-72 rounded-[24px]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-[20px]" />
          <Skeleton className="h-40 rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!rec || rec.results.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <Icon name="search" className="text-[40px] text-ink-muted" />
        <h1 className="text-headline-md font-extrabold text-ink">No doctors yet</h1>
        <p className="text-body-md text-ink-muted">Tell us how you feel and we&apos;ll find good doctors for you.</p>
        <Link href="/intake" className="inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">
          Find care
        </Link>
      </div>
    );
  }

  const sorted = [...rec.results].sort((a, b) => b.score - a.score);
  const hero = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Choose a doctor</h1>
        <p className="text-body-md text-ink-muted">The best doctors for how you feel.</p>
      </div>

      {rec.cold_start && <ColdStartBanner />}

      <HeroMatchCard item={hero} />

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-ink">Other good doctors</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rest.map((item) => (
              <CompactMatchCard key={item.doctor_id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
