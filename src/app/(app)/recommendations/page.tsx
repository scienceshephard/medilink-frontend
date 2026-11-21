"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColdStartBanner } from "@/components/app/ColdStartBanner";
import { MatchCard } from "@/components/app/MatchCard";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadRecommendation } from "@/lib/recommendations";
import { FindCareSteps } from "@/components/app/FindCareSteps";
import { FacilityMatches } from "@/components/app/FacilityMatches";
import type { RecommendationResponse } from "@/lib/types";
import { PageHeader } from "@/components/app/PageHeader";

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
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      <FindCareSteps current="matches" />
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
    const noDoctors = Boolean(rec?.no_doctors_available);
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-4 py-10 text-center">
        <FindCareSteps current="matches" />
        {rec?.urgent_care && (
          <div role="alert" className="w-full rounded-2xl border-2 border-error bg-red-soft p-5 text-left text-error">
            <p className="font-extrabold">Please seek urgent care</p>
            <p className="mt-1">{rec.urgent_care_message}</p>
          </div>
        )}
        <Icon name={noDoctors ? "medical_services" : "search"} className="text-[40px] text-ink-muted" />
        <h1 className="text-headline-md font-extrabold text-ink">{noDoctors ? "No eligible doctors are available right now" : "No recommendation found"}</h1>
        <p className="text-body-md text-ink-muted">{noDoctors ? "Your symptom description was received, but no active, available doctor profile matched in the directory. Please contact a local clinic for care, and check back later." : "Tell us how you feel to request a doctor match."}</p>
        {!noDoctors && <Link href="/find-care" className="inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">Find care</Link>}
        <div className="w-full pt-5 text-left"><FacilityMatches items={rec?.facility_results} /></div>
      </div>
    );
  }

  const sorted = [...rec.results].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <PageHeader back="/find-care" title="Choose a doctor" subtitle="Best match first." />

      {rec.urgent_care && (
        <div role="alert" className="rounded-2xl border-2 border-error bg-red-soft p-5 text-error">
          <p className="font-extrabold">Please seek urgent care</p>
          <p className="mt-1">{rec.urgent_care_message}</p>
        </div>
      )}
      {rec.cold_start && <ColdStartBanner />}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {sorted.map((item, i) => <MatchCard key={item.doctor_id} item={item} best={i === 0} />)}
      </div>
      <p className="text-[12px] leading-5 text-ink-muted">MediLink does not diagnose. If your symptoms suddenly become severe or you feel unsafe, seek urgent local care.</p>

      <FacilityMatches items={rec.facility_results} />
    </div>
  );
}
