"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { LocationMap } from "@/components/ui/LocationMap";
import { getCurrentPosition, reverseGeocode, searchPlaces, type Coordinates, type PlaceMatch } from "@/lib/geo";

// Beyond this the browser guessed from Wi-Fi or IP, not GPS.
const APPROXIMATE_METRES = 150;

function describeAccuracy(metres: number): string {
  return metres >= 1000 ? `about ${(metres / 1000).toFixed(1)} km` : `about ${Math.round(metres)} m`;
}

/**
 * One place to set a location: type it and find it on the map, use the
 * device's position, then drag the pin to the exact spot.
 *
 * `area` mode keeps the text to a town or neighbourhood and rewrites it from
 * the pin. `address` mode is a full street address the person types; the pin
 * never overwrites what they wrote.
 */
export function LocationPicker({
  mode,
  label,
  text,
  onTextChange,
  point,
  onPointChange,
  placeholder,
  hint,
  maxLength = mode === "area" ? 120 : 255,
}: {
  mode: "area" | "address";
  label: string;
  text: string;
  onTextChange: (text: string) => void;
  point: Coordinates | null;
  onPointChange: (point: Coordinates | null) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState<"search" | "gps" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [matches, setMatches] = useState<PlaceMatch[]>([]);
  // The text as it was when the pin was last placed, to notice when the person
  // types a different place but leaves the old pin behind.
  const pinnedText = useRef<string | null>(null);
  const lookup = useRef(0);

  useEffect(() => {
    if (point && pinnedText.current === null) pinnedText.current = text.trim();
    if (!point) pinnedText.current = null;
  }, [point, text]);

  function place(next: Coordinates, nextText?: string) {
    onPointChange(next);
    if (nextText !== undefined) onTextChange(nextText);
    pinnedText.current = (nextText ?? text).trim();
    setMatches([]);
  }

  async function describePin(next: Coordinates, prefix: string) {
    const run = ++lookup.current;
    const found = await reverseGeocode(next);
    if (run !== lookup.current) return;
    if (mode === "area" && found.area) {
      onTextChange(found.area);
      pinnedText.current = found.area;
    } else if (mode === "address" && !text.trim() && found.address) {
      onTextChange(found.address);
      pinnedText.current = found.address;
    }
    const near = found.area ? ` near ${found.area}` : "";
    setMessage(`${prefix}${near}.${mode === "address" ? " Check the address and add your house number or a landmark." : ""}`);
  }

  async function find() {
    if (text.trim().length < 3) {
      setMessage(mode === "area" ? "Type your town or area first, for example Yaba, Lagos." : "Type the address first, then find it on the map.");
      return;
    }
    setBusy("search");
    setMessage("Searching the map…");
    setMatches([]);
    try {
      let results = await searchPlaces(text);
      // Full addresses often include a house number or landmark the map does
      // not know. Retry with the last parts (street, area, town).
      if (!results.length && mode === "address") {
        const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
        if (parts.length > 1) results = await searchPlaces(parts.slice(1).join(", "));
      }
      if (!results.length) {
        setMessage("No match on the map. Try a nearby landmark, street or town, or use your current location.");
      } else if (results.length === 1) {
        const [match] = results;
        place(match, mode === "area" ? match.area ?? text : undefined);
        setMessage("Found. Drag the pin or tap the map if it is not exactly right.");
      } else {
        setMatches(results);
        setMessage("Choose the right place:");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "The map search did not work. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function useDevice() {
    setBusy("gps");
    setMessage("Finding your location…");
    setMatches([]);
    try {
      const position = await getCurrentPosition();
      const next = { latitude: position.latitude, longitude: position.longitude };
      place(next);
      const prefix = position.accuracy > APPROXIMATE_METRES
        ? `Your device could only place you within ${describeAccuracy(position.accuracy)}. Drag the pin to the exact spot. Pinned`
        : "Pinned";
      await describePin(next, prefix);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Location was not shared.");
    } finally {
      setBusy(null);
    }
  }

  function moved(next: Coordinates) {
    place(next);
    void describePin(next, "Pin moved");
  }

  const stale = point !== null && pinnedText.current !== null && text.trim() !== pinnedText.current && mode === "area";
  const fieldClass = "w-full rounded-xl border border-border bg-warm-white px-3 text-body-md text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-primary bg-warm-white px-4 text-caption font-extrabold text-primary disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-extrabold text-ink">{label}</label>
      {mode === "area" ? (
        <input
          id={inputId}
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void find(); } }}
          className={`h-12 ${fieldClass}`}
        />
      ) : (
        <textarea
          id={inputId}
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onTextChange(event.target.value)}
          className={`min-h-24 p-3 ${fieldClass}`}
        />
      )}
      {hint && <span className="text-caption text-ink-muted">{hint}</span>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void find()} disabled={busy !== null} className={chip}>
          <Icon name="search" className="text-[16px]" />{busy === "search" ? "Searching…" : "Find on map"}
        </button>
        <button type="button" onClick={() => void useDevice()} disabled={busy !== null} className={chip}>
          <Icon name="my_location" className="text-[16px]" />{busy === "gps" ? "Locating…" : "Use my current location"}
        </button>
        {point && (
          <button type="button" onClick={() => { onPointChange(null); setMatches([]); setMessage("Map pin removed. Save to apply."); }} className="text-caption font-bold text-ink-muted underline">
            Remove pin
          </button>
        )}
      </div>

      {message && <p role="status" aria-live="polite" className="text-caption text-ink-muted">{message}</p>}
      {matches.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {matches.map((match) => (
            <li key={`${match.latitude},${match.longitude}`}>
              <button
                type="button"
                onClick={() => {
                  place(match, mode === "area" ? match.area ?? text : undefined);
                  setMessage("Pinned. Drag the pin or tap the map if it is not exactly right.");
                }}
                className="flex w-full items-start gap-2 rounded-xl border border-border bg-white p-3 text-left text-body-sm text-ink hover:border-primary"
              >
                <Icon name="location_on" className="mt-0.5 text-[18px] text-primary" />{match.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {stale && (
        <p className="rounded-xl bg-primary-soft px-3 py-2 text-caption font-bold text-ink">
          The map pin is still at your earlier location. Tap “Find on map” to move it to “{text.trim()}”, or remove the pin.
        </p>
      )}
      {point && (
        <>
          <LocationMap point={point} onMove={moved} label="Map: drag the pin or tap to set the exact spot" />
          <span className="text-caption text-ink-muted">Drag the pin or tap the map to adjust it.</span>
        </>
      )}
    </div>
  );
}
