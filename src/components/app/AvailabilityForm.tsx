"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import type { SlotMode } from "@/lib/types";
import { cn } from "@/components/ui/cn";

interface AvailabilityFormProps {
  onAdded: () => void;
  clinicAddress?: string | null;
  meetingLink?: string | null;
  serviceArea?: string | null;
}

export function AvailabilityForm({ onAdded, clinicAddress, meetingLink, serviceArea }: AvailabilityFormProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState<SlotMode>("in_person");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = (mode === "in_person" && !clinicAddress) || (mode === "video" && !meetingLink) || (mode === "home_visit" && !serviceArea);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;
    setLoading(true);
    setError(null);
    try {
      await api.doctors.addAvailability({ start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(), mode });
      setStart("");
      setEnd("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the time.");
    } finally {
      setLoading(false);
    }
  }

  const field = "h-14 w-full rounded-2xl border border-border bg-sand px-4 text-body-md text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-bold text-ink">How will you see them?</p>
        <div className="grid grid-cols-3 gap-2">
          {([["in_person", "local_hospital", "At clinic"], ["video", "videocam", "Video call"], ["home_visit", "home_pin", "Home visit"]] as const).map(([m, ic, lab]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border py-4 font-bold transition-colors",
                mode === m ? "border-2 border-primary bg-primary-soft text-ink" : "border border-border bg-warm-white text-ink",
              )}
            >
              <Icon name={ic} /> {lab}
            </button>
          ))}
        </div>
      </div>

      {blocked && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-4 py-3 text-caption font-bold text-warning">
          <Icon name="error" className="text-[18px]" />
          <span>
            {mode === "in_person" ? "Add your clinic address first." : mode === "video" ? "Add a video link first." : "Add your town or service area first."}{" "}
            <Link href="/doctor-profile" className="underline">Go to profile</Link>
          </span>
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="font-bold text-ink">Starts</span>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required className={field} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold text-ink">Ends</span>
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required className={field} />
      </label>

      {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}

      <button
        type="submit"
        disabled={!start || !end || blocked || loading}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary disabled:opacity-50"
      >
        <Icon name="add" /> {loading ? "Adding…" : "Add this time"}
      </button>
    </form>
  );
}
