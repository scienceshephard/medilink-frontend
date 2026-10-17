"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColdStartBanner } from "@/components/app/ColdStartBanner";
import { HeroMatchCard, CompactMatchCard } from "@/components/app/MatchCard";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadRecommendation } from "@/lib/recommendations";
import { FindCareSteps } from "@/components/app/FindCareSteps";
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

  if (rec?.urgent_care) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 py-8">
        <div role="alert" className="rounded-2xl border-2 border-error bg-red-soft p-6 text-error">
          <h1 className="text-headline-md font-extrabold">Please seek urgent care</h1>
          <p className="mt-2 text-body-md">{rec.urgent_care_message}</p>
          <p className="mt-3 font-bold">This service cannot assess emergencies. Do not wait for an online appointment.</p>
        </div>
      </div>
    );
  }

  if (!rec || rec.results.length === 0) {
    const noDoctors = Boolean(rec?.no_doctors_available);
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <FindCareSteps current="matches" />
        <Icon name={noDoctors ? "medical_services" : "search"} className="text-[40px] text-ink-muted" />
        <h1 className="text-headline-md font-extrabold text-ink">{noDoctors ? "No eligible doctors are available right now" : "No recommendation found"}</h1>
        <p className="text-body-md text-ink-muted">{noDoctors ? "Your symptom description was received, but no active, available doctor profile matched in the directory. Please contact a local clinic for care, and check back later." : "Tell us how you feel to request a doctor match."}</p>
        {!noDoctors && <Link href="/find-care" className="inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">Find care</Link>}
      </div>
    );
  }

  const sorted = [...rec.results].sort((a, b) => b.score - a.score);
  const hero = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <FindCareSteps current="matches" />
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[.16em] text-[#65756F]">Your clinician matches</p>
        <h1 className="mt-2 font-serif text-[clamp(36px,5vw,52px)] leading-[1.08] tracking-[-.04em] text-[#19352E]">People who may be able to help.</h1>
        <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-[#65756F]">We ranked these clinicians using the concern and location you shared. Review the first match, then compare other options before choosing.</p>
      </div>

      {rec.urgent_care && (
        <div role="alert" className="rounded-2xl border-2 border-error bg-red-soft p-5 text-error">
          <p className="font-extrabold">Please seek urgent care</p>
          <p className="mt-1">{rec.urgent_care_message}</p>
        </div>
      )}
      {rec.cold_start && <ColdStartBanner />}

      <HeroMatchCard item={hero} />
      <p className="text-[11px] leading-5 text-[#65756F]">MediLink does not diagnose. If your symptoms suddenly become severe or you feel unsafe, seek urgent local care.</p>

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3 border-b border-[#E4E9E5] pb-3"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#65756F]">More clinicians</p><h2 className="mt-1 font-serif text-[27px] text-[#19352E]">Compare your other matches</h2></div><span className="text-[12px] text-[#65756F]">{rest.length} options</span></div>
          <div className="flex flex-col gap-3">
            {rest.map((item) => (
              <CompactMatchCard key={item.doctor_id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
