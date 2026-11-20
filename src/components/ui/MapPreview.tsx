import type { Coordinates } from "@/lib/geo";
import { LocationMap } from "./LocationMap";

/** A read-only map with a pin, so people can see a location that was shared. */
export function MapPreview({ point, className = "" }: { point: Coordinates; className?: string }) {
  return <LocationMap point={point} className={className} />;
}
