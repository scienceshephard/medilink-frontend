"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MatchBreakdown } from "@/components/app/MatchBreakdown";
import { Skeleton } from "@/components/ui/Skeleton";
import type { RecommendationItem, RecommendationResponse } from "@/lib/types";

export default function MatchDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<RecommendationItem | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("telemed:lastRecommendation");
      if (raw) {
        const parsed: RecommendationResponse = JSON.parse(raw);
        const found = parsed.results.find((r) => r.doctor_id === Number(params.doctorId)) ?? null;
        setItem(found);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [params.doctorId]);

  useEffect(() => {
    if (loaded && item === null) router.replace("/recommendations");
  }, [loaded, item, router]);

  if (!loaded) return <Skeleton className="mx-auto h-96 w-full max-w-[900px] rounded-[24px]" />;
  if (!item) return null;

  const firstName = item.doctor_name.replace(/^Dr\.?\s+/i, "").split(" ")[0] ?? item.doctor_name;

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Why this doctor?</h1>
        <p className="text-body-md text-ink-muted">Here&apos;s why we picked Dr. {firstName} for you.</p>
      </div>
      <MatchBreakdown item={item} />
    </div>
  );
}
