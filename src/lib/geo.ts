export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Position extends Coordinates {
  /** Radius in metres within which the device is probably located. */
  accuracy: number;
}

/**
 * Ask the browser for the device's position. Rejects with a message a patient can act on.
 * Laptops without GPS locate by Wi-Fi or IP address, which can be kilometres off, so
 * callers should show `accuracy` and let the person correct the pin.
 */
export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot share your location. Type your area instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
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
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { area: null, address: null };
    const data = await res.json();
    const a = data.address ?? {};
    const locality = a.suburb || a.neighbourhood || a.town || a.city_district || a.city || a.village || a.county;
    const state = a.state;
    const area = areaFrom(a);
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const address = [street, locality, state].filter(Boolean).join(", ") || data.display_name || null;
    return { area, address };
  } catch {
    return { area: null, address: null };
  }
}

export interface PlaceMatch extends Coordinates {
  /** Full name returned by the geocoder, for the person to recognise. */
  label: string;
  area: string | null;
}

function areaFrom(address: Record<string, string> | undefined): string | null {
  const a = address ?? {};
  const locality = a.suburb || a.neighbourhood || a.town || a.city_district || a.city || a.village || a.county;
  return [locality, a.state].filter(Boolean).join(", ") || null;
}

/**
 * Find places matching typed text, limited to Nigeria. Nominatim's usage policy
 * forbids search-as-you-type, so call this only on an explicit action.
 */
export async function searchPlaces(query: string): Promise<PlaceMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ng&accept-language=en&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("The map search is unavailable right now. Try again, or use your current location.");
  const data: { lat: string; lon: string; display_name: string; address?: Record<string, string> }[] = await res.json();
  return data.map((item) => ({
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    label: item.display_name,
    area: areaFrom(item.address),
  }));
}

/** Straight-line distance in kilometres. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** A Google Maps link that opens turn-by-turn directions to a pin or an address. */
export function directionsUrl(destination: Coordinates | string): string {
  const value = typeof destination === "string" ? destination : `${destination.latitude},${destination.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}`;
}
