import { cn } from "./cn";

// Renders a Material Symbols Outlined glyph. `name` is the ligature
// (e.g. "notifications", "calendar_today"). `fill` renders the filled variant.
export function Icon({
  name,
  fill,
  className,
}: {
  name: string;
  fill?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none leading-none", fill && "icon-fill", className)}
    >
      {name}
    </span>
  );
}
