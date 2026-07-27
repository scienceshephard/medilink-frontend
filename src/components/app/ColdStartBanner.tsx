import { Icon } from "@/components/ui/Icon";

export function ColdStartBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-ink">
      <Icon name="info" className="mt-0.5 shrink-0 text-accent" />
      <p className="text-body-md">
        Because you&apos;re new, we match on your symptoms first — it gets more personal as you use MediLink.
      </p>
    </div>
  );
}
