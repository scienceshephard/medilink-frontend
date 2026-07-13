"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import type { SlotMode } from "@/lib/types";

interface AvailabilityFormProps {
  onAdded: () => void;
  clinicAddress?: string | null;
  meetingLink?: string | null;
}

export function AvailabilityForm({ onAdded, clinicAddress, meetingLink }: AvailabilityFormProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState<SlotMode>("in_person");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fail here, where it's cheap to fix — not when a patient is already waiting.
  const blocked =
    (mode === "in_person" && !clinicAddress) || (mode === "video" && !meetingLink);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.doctors.addAvailability({
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        mode,
      });
      setSuccess(true);
      setStart("");
      setEnd("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add availability slot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-label-md text-on-surface">How will you see the patient?</p>
        <div className="flex gap-2">
          <Chip active={mode === "in_person"} onClick={() => setMode("in_person")}>
            <Icon name="location_on" className="text-[18px]" />
            In-person
          </Chip>
          <Chip active={mode === "video"} onClick={() => setMode("video")}>
            <Icon name="videocam" className="text-[18px]" />
            Video
          </Chip>
        </div>
      </div>

      {blocked && (
        <p className="flex items-start gap-2 rounded-lg bg-warning-container px-4 py-3 text-caption text-on-warning-container">
          <Icon name="error" className="mt-0.5 text-[18px]" />
          <span>
            {mode === "in_person"
              ? "Add a clinic address to your profile before offering in-person slots."
              : "Add a meeting link to your profile before offering video slots."}{" "}
            <Link href="/doctor-profile" className="font-semibold underline">
              Go to profile
            </Link>
          </span>
        </p>
      )}

      <Input
        label="Start time"
        type="datetime-local"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
      />
      <Input
        label="End time"
        type="datetime-local"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        required
      />

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-success-container px-4 py-3 text-label-md text-on-success-container">
          Availability slot added.
        </p>
      )}

      <Button type="submit" loading={loading} disabled={!start || !end || blocked} full>
        Add availability
      </Button>
    </form>
  );
}
