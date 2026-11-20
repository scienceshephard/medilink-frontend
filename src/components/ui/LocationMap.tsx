"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/geo";

// A drawn pin instead of Leaflet's default PNG marker, whose image paths do
// not survive bundling.
const PIN_HTML = `<svg width="32" height="42" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#D96B4A" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>`;

/**
 * An OpenStreetMap view with a pin. Pass `onMove` to let the person drag the
 * pin or tap the map to place it; without it the map is read-only.
 */
export function LocationMap({
  point,
  onMove,
  zoom = 16,
  className = "",
  label = "Map of the shared location",
}: {
  point: Coordinates;
  onMove?: (point: Coordinates) => void;
  zoom?: number;
  className?: string;
  label?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const editable = Boolean(onMove);

  useEffect(() => {
    let cancelled = false;
    // Leaflet touches `window` when imported, so load it only in the browser.
    void import("leaflet").then((L) => {
      if (cancelled || !container.current || map.current) return;
      const instance = L.map(container.current, { zoomControl: true, attributionControl: true })
        .setView([point.latitude, point.longitude], zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);
      const pin = L.marker([point.latitude, point.longitude], {
        draggable: editable,
        keyboard: editable,
        title: editable ? "Drag to the exact spot" : undefined,
        icon: L.divIcon({ html: PIN_HTML, className: "", iconSize: [32, 42], iconAnchor: [16, 41] }),
      }).addTo(instance);
      if (editable) {
        pin.on("dragend", () => {
          const { lat, lng } = pin.getLatLng();
          moveRef.current?.({ latitude: lat, longitude: lng });
        });
        instance.on("click", (event) => {
          pin.setLatLng(event.latlng);
          moveRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
        });
      }
      map.current = instance;
      marker.current = pin;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is created once; position updates are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  useEffect(() => {
    const pin = marker.current;
    if (!pin || !map.current) return;
    const current = pin.getLatLng();
    if (current.lat === point.latitude && current.lng === point.longitude) return;
    pin.setLatLng([point.latitude, point.longitude]);
    map.current.setView([point.latitude, point.longitude], Math.max(map.current.getZoom(), zoom));
  }, [point.latitude, point.longitude, zoom]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      // isolate keeps Leaflet's high z-index panes beneath app headers and modals.
      className={`isolate z-0 h-56 w-full overflow-hidden rounded-xl border border-border ${className}`}
    />
  );
}
