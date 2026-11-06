"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { CarePlan } from "@/lib/types";

const FOLLOW_UP_LABEL: Record<string, string> = {
  none: "No follow-up needed",
  "1_week": "Follow-up in 1 week",
  "2_weeks": "Follow-up in 2 weeks",
};

export default function CarePlanPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-[760px] rounded-[24px]" />}>
      <CarePlanContent />
    </Suspense>
  );
}

function CarePlanContent() {
  const { role } = useAuth();
  const params = useSearchParams();
  const planId = Number(params.get("id"));

  const { data: plans } = useApi(() => api.carePlans.mine(), []);
  const { data: plan, loading, error } = useApi(
    () => (planId ? api.carePlans.get(planId) : Promise.resolve(null)),
    [planId],
  );

  // No id — show the plan list / latest
  if (!planId) {
    const latest = plans?.[0];
    if (latest) {
      return <PlanView plan={latest} />;
    }
    return (
      <div className="mx-auto max-w-[760px]">
        <h1 className="text-display-sm font-extrabold text-ink">Care plans</h1>
        <div className="mt-6 space-y-3">
          {plans?.length === 0 && (
            <Card className="py-10 text-center">
              <Icon name="healing" className="mx-auto h-10 w-10 text-ink-muted" />
              <p className="mt-3 font-extrabold text-ink">No care plan yet</p>
              <p className="mt-1 text-body-md text-ink-muted">
                {role === "doctor" ? "Prepare one after your next visit." : "Your clinician shares one after a visit."}
              </p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <Skeleton className="mx-auto h-96 max-w-[760px] rounded-[24px]" />;
  if (error || !plan)
    return (
      <div className="mx-auto max-w-[760px] py-16 text-center">
        <p className="text-body-md text-ink-muted">{error ?? "Care plan not found."}</p>
        <Link href="/care-plan" className="mt-4 inline-block text-body-md font-bold text-primary">Back to care plans</Link>
      </div>
    );
  return <PlanView plan={plan} />;
}

function PlanView({ plan }: { plan: CarePlan }) {
  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">Your care plan</h1>
      <p className="mt-1 text-body-md text-ink-muted">
        From {plan.doctor_name ?? "your clinician"}
        {plan.patient_name ? ` · for ${plan.patient_name}` : ""}
      </p>

      <Card className="mt-6">
        <h2 className="font-extrabold text-ink">Summary</h2>
        <p className="mt-2 text-body-md text-ink">{plan.summary}</p>
      </Card>

      {plan.steps.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-extrabold text-ink">Steps</h2>
          <ul className="mt-3 space-y-3">
            {plan.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon name={s.icon || "check_circle"} className="h-5 w-5" />
                </span>
                <span className="pt-1.5 text-body-md font-semibold text-ink">{s.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.follow_up && (
        <Card className="mt-4 flex items-center gap-3">
          <Icon name="event_available" className="h-6 w-6 text-accent" />
          <p className="text-body-md font-semibold text-ink">
            {FOLLOW_UP_LABEL[plan.follow_up] ?? plan.follow_up}
          </p>
        </Card>
      )}
    </div>
  );
}
