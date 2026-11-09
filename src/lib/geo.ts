export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Ask the browser for the device's position. Rejects with a message a patient can act on. */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot share your location. Type your area instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (err) =>
        reject(new Error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Allow location for this site in your browser settings, or type your area."
            : "Your location could not be found. Check that location is on, or type your area.",
        )),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export interface PlaceName {
  /** Neighbourhood or town plus state, e.g. "Ikorodu, Lagos". */
  area: string | null;
  /** Fuller street-level description, when one is known. */
  address: string | null;
}

/**
 * Turn coordinates into a place name with OpenStreetMap's free Nominatim
 * service. Best effort: returns nulls rather than throwing, because the
 * coordinates alone are still useful.
 */
export async function reverseGeocode({ latitude, longitude }: Coordinates): Promise<PlaceName> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { area: null, address: null };
    const data = await res.json();
    const a = data.address ?? {};
    const locality = a.suburb || a.neighbourhood || a.town || a.city_district || a.city || a.village || a.county;
    const state = a.state;
    const area = [locality, state].filter(Boolean).join(", ") || null;
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const address = [street, locality, state].filter(Boolean).join(", ") || data.display_name || null;
    return { area, address };
  } catch {
    return { area: null, address: null };
  }
}

/** A Google Maps link that opens turn-by-turn directions to a pin or an address. */
export function directionsUrl(destination: Coordinates | string): string {
  const value = typeof destination === "string" ? destination : `${destination.latitude},${destination.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}`;
}
