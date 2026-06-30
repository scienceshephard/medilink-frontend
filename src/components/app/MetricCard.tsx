import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import type { ReactNode } from "react";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: string;
  className?: string;
}

export function MetricCard({ label, value, sub, icon, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-xl p-md soft-shadow border border-surface-container-high flex flex-col gap-3",
        className,
      )}
    >
      {icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
          <Icon name={icon} className="text-[20px]" />
        </span>
      )}
      <p className="text-display-lg text-on-surface tabular-nums leading-none">{value}</p>
      <div>
        <p className="text-label-md uppercase tracking-wider text-on-surface-variant">{label}</p>
        {sub && <p className="mt-0.5 text-caption text-outline">{sub}</p>}
      </div>
    </div>
  );
}
