import { cn } from "./ui/cn";
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold text-primary", className)}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-on-primary text-label-md">T</span>
      <span className="text-headline-md tracking-tight">TeleMed</span>
    </span>
  );
}
