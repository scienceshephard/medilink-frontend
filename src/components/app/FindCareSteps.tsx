"use client";

import Link from "next/link";

const STEPS = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "symptoms", label: "Describe symptoms", href: "/find-care" },
  { id: "matches", label: "Recommended doctors", href: "/find-care/recommendations" },
  { id: "time", label: "Choose a time", href: null },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function FindCareSteps({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Find care steps" className="mb-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-caption">
        {STEPS.map((step, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          const className = active
            ? "rounded-full bg-primary px-3 py-2 font-extrabold text-on-primary"
            : complete
              ? "font-bold text-primary underline underline-offset-4"
              : "font-medium text-ink-muted";
          return (
            <li key={step.id} className="flex items-center gap-2">
              {step.href && complete ? (
                <Link href={step.href} className={className}>{step.label}</Link>
              ) : (
                <span className={className} aria-current={active ? "step" : undefined}>{step.label}</span>
              )}
              {index < STEPS.length - 1 && <span aria-hidden="true" className="text-ink-muted">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
