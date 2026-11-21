"use client";

const STEPS = [
  { id: "symptoms", label: "Your concern", href: "/find-care" },
  { id: "matches", label: "Clinicians", href: "/find-care/recommendations" },
  { id: "time", label: "Care option", href: null },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function FindCareSteps({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Find care steps" className="w-full max-w-[640px]">
      <ol className="flex items-center gap-2 text-[12px] sm:gap-3 sm:text-[13px]">
        {STEPS.map((step, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <span aria-current={active ? "step" : undefined} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${active ? "bg-primary text-on-primary" : complete ? "bg-primary-soft text-primary" : "border border-border text-ink-muted"}`}>{complete ? "✓" : index + 1}</span>
              <span className={active ? "truncate font-extrabold text-ink" : complete ? "truncate font-bold text-primary" : "truncate font-semibold text-ink-muted"}>{step.label}</span>
              {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
