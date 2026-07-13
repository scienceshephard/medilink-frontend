"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";

interface AvailabilityFormProps {
  onAdded: () => void;
}

export function AvailabilityForm({ onAdded }: AvailabilityFormProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        // Interim default — Task 15 replaces this with a real in-person/video toggle.
        mode: "in_person",
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
          Availability slot added successfully.
        </p>
      )}
      <Button type="submit" loading={loading} disabled={!start || !end} full>
        Add availability
      </Button>
    </form>
  );
}
