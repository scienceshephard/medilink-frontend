"use client";

import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";

const STEPS = [
  { done: true, label: "License submitted" },
  { done: true, label: "Under review" },
  { done: false, label: "Ready to take patients" },
];

export default function PendingReviewPage() {
  const { data: me } = useApi(() => api.doctors.me(), []);

  return (
    <div className="mx-auto max-w-[560px] py-12 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary mx-auto">
        <Icon name="hourglass_top" className="h-10 w-10" />
      </div>
      <h1 className="mt-5 text-display-sm font-extrabold text-ink">We are reviewing your credentials</h1>
      <p className="mt-2 text-body-md text-ink-muted">
        Usually under 2 working days. We will email you at <b>{me?.email}</b> the moment you are verified.
      </p>

      <Card className="mt-8 text-left">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3 py-2.5">
            <span className={`grid h-8 w-8 place-items-center rounded-full ${s.done ? "bg-accent text-on-primary" : "border-2 border-border text-ink-muted"}`}>
              <Icon name={s.done ? "check" : "schedule"} className="h-4 w-4" />
            </span>
            <span className={`flex-1 text-body-md ${s.done ? "font-bold text-ink" : "text-ink-muted"}`}>{s.label}</span>
            {i === 1 && <span className="text-xs text-ink-muted">Now</span>}
          </div>
        ))}
      </Card>
    </div>
  );
}
