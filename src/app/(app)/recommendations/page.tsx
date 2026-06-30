"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColdStartBanner } from "@/components/app/ColdStartBanner";
import { HeroMatchCard, CompactMatchCard } from "@/components/app/MatchCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { RecommendationResponse } from "@/lib/types";

export default function RecommendationsPage() {
  const [rec, setRec] = useState<RecommendationResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("telemed:lastRecommendation");
      if (raw) setRec(JSON.parse(raw));
    } catch {
      /* ignore malformed JSON */
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!rec || rec.results.length === 0) {
    return (
      <EmptyState
        title="No matches yet"
        description="Complete the intake flow and we'll rank the best specialists for your symptoms."
        action={
          <Link href="/intake">
            <Button>Start intake</Button>
          </Link>
        }
      />
    );
  }

  const sorted = [...rec.results].sort((a, b) => b.score - a.score);
  const hero = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div className="flex flex-col gap-8">
      {/* Page heading */}
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface mb-xs">Your Matches</h1>
        <p className="text-body-md text-on-surface-variant">
          We&apos;ve found the best specialists for your specific needs.
        </p>
      </div>

      {/* Cold-start notice */}
      {rec.cold_start && <ColdStartBanner />}

      {/* Hero card — top match */}
      <section aria-label="Top Match">
        <HeroMatchCard item={hero} />
      </section>

      {/* Secondary matches */}
      {rest.length > 0 && (
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-on-surface">
              Other Highly Rated Specialists
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            {rest.map((item) => (
              <CompactMatchCard key={item.doctor_id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
