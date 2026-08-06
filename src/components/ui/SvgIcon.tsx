import { cn } from "./cn";

/**
 * Inline SVG icons for the PUBLIC surface (`/`, `/login`, `/register`).
 *
 * Those routes need exactly the glyphs below. Pulling them inline means the
 * public pages make no cross-origin request for the Material Symbols font —
 * which was a render-blocking stylesheet on fonts.googleapis.com that then
 * triggered a font download from fonts.gstatic.com, two serial round trips for
 * eight icons out of a ~3,500-glyph set.
 *
 * It also removes a real failure mode: the icon font is ligature-based, so
 * before it loads the browser paints the ligature's literal text — users could
 * see the words "arrow_forward" or "calendar_month" flash on screen.
 *
 * Authenticated screens keep the font (`<Icon>`), where the icon vocabulary is
 * large and open-ended and a warm cache is likely.
 *
 * Paths are 24x24 Material Symbols outlines. Adding an icon here means adding
 * its path — that friction is deliberate: it keeps the public surface small.
 */

const PATHS = {
  arrow_forward: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
  favorite:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  search:
    "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  calendar_month:
    "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z",
  verified:
    "M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z",
  health_and_safety:
    "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm4 11h-3v3h-2v-3H8v-2h3V7h2v3h3v2z",
  payments:
    "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z",
} as const;

export type SvgIconName = keyof typeof PATHS;

/**
 * Drop-in replacement for `<Icon>` on public routes.
 *
 * `fill` is accepted so call sites match `<Icon>`, but these paths are solid
 * single-weight glyphs — there is no separate outlined variant to switch to.
 * Sizing follows the font size (`1em`), exactly as the icon font did, so
 * existing `text-[30px]` style classes keep working unchanged.
 */
export function SvgIcon({
  name,
  fill: _fill,
  className,
}: {
  name: SvgIconName;
  fill?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("inline-block h-[1em] w-[1em] shrink-0 select-none align-middle", className)}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
