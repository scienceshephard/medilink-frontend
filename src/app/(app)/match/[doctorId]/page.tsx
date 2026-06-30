"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MatchBreakdown } from "@/components/app/MatchBreakdown";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import type { RecommendationItem, RecommendationResponse } from "@/lib/types";

export default function MatchDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<RecommendationItem | null>(null);
  const [rec, setRec] = useState<RecommendationResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("telemed:lastRecommendation");
      if (raw) {
        const parsed: RecommendationResponse = JSON.parse(raw);
        setRec(parsed);
        const doctorId = Number(params.doctorId);
        const found = parsed.results.find((r) => r.doctor_id === doctorId) ?? null;
        setItem(found);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [params.doctorId]);

  // Redirect if not found once loaded
  useEffect(() => {
    if (loaded && item === null) {
      router.replace("/recommendations");
    }
  }, [loaded, item, router]);

  if (!loaded) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="md:col-span-5 flex flex-col gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <div className="md:col-span-7 flex flex-col gap-6">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!item || !rec) return null;

  const doctorFirstName = item.doctor_name.replace(/^Dr\.?\s+/i, "").split(" ")[0] ?? item.doctor_name;

  return (
    <div className="flex flex-col gap-8">
      {/* Page heading */}
      <section className="text-center md:text-left">
        <h1 className="text-headline-lg font-bold text-on-surface mb-sm">
          Understanding your match, {doctorFirstName}.
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          We&apos;ve found a specialist who is uniquely suited to help with your symptoms. Here is a
          simple breakdown of why TeleMed AI recommended {item.doctor_name}.
        </p>
      </section>

      {/* Breakdown */}
      <MatchBreakdown item={item} weights={rec.weights} />

      {/* Book CTA */}
      <div className="rounded-2xl bg-primary-container p-md">
        <h3 className="text-headline-md font-semibold text-on-primary-container mb-sm">
          Next Steps
        </h3>
        <p className="text-body-md text-on-primary-container mb-md opacity-90">
          Ready to move forward? Booking is quick and easy.
        </p>
        <Link href={`/doctors/${item.doctor_id}/book`}>
          <Button size="lg" className="bg-primary text-on-primary hover:bg-surface-tint min-h-[44px]">
            Book Appointment with {item.doctor_name}
            <Icon name="arrow_forward" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
