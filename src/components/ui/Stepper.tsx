export function Stepper({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div>
      <div className="h-1.5 w-full rounded-full bg-surface-container-high">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-label-sm font-semibold uppercase tracking-wide text-primary">Step {current} of {total}</p>
    </div>
  );
}
