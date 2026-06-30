import { Icon } from "@/components/ui/Icon";

export function ColdStartBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl bg-secondary-fixed p-md text-on-secondary-fixed-variant">
      <Icon name="info" className="mt-0.5 shrink-0 text-[20px]" />
      <p className="text-body-md">
        Because you&apos;re new, we&apos;re matching on symptom fit first — this gets more
        personalised as you use TeleMed.
      </p>
    </div>
  );
}
