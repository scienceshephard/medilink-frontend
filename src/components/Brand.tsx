import { cn } from "./ui/cn";
import { SvgIcon } from "./ui/SvgIcon";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold text-ink", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-on-primary">
        <SvgIcon name="favorite" fill />
      </span>
      <span className="text-headline-md tracking-tight">MediLink</span>
    </span>
  );
}
