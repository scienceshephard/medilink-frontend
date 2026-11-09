import type { Coordinates } from "@/lib/geo";

/** A small OpenStreetMap view with a pin, so people can see the location they shared. */
export function MapPreview({ point, className = "" }: { point: Coordinates; className?: string }) {
  const d = 0.006;
  const bbox = [point.longitude - d, point.latitude - d, point.longitude + d, point.latitude + d].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.latitude},${point.longitude}`;
  return (
    <iframe
      title="Map of the shared location"
      src={src}
      loading="lazy"
      className={`h-48 w-full rounded-xl border border-border ${className}`}
    />
  );
}
