"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { PendingDoctorRow } from "@/components/app/PendingDoctorRow";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";


export default function AdminDoctorsPage() {
  const pending = useApi(() => api.admin.pendingDoctors(), []);
  const verified = useApi(() => api.doctors.list(), []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [specialization, setSpecialization] = useState("all");

  async function act(fn: () => Promise<unknown>, id: number) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      pending.reload();
      verified.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const waiting = pending.data ?? [];
  const working = verified.data ?? [];
  const specialties = Array.from(new Set(working.flatMap((doctor) => doctor.specialization_names ?? []))).sort();
  const filtered = working.filter((doctor) => {
    const text = `${doctor.full_name} ${doctor.location ?? ""} ${(doctor.specialization_names ?? []).join(" ")}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (specialization === "all" || doctor.specialization_names?.includes(specialization));
  });

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Doctors</h1>
        <p className="text-body-md text-ink-muted">{working.length} working · {waiting.length} waiting to join</p>
      </div>

      {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-headline-md font-extrabold text-ink">Waiting to join</h2>
          {waiting.length > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-caption font-extrabold text-on-primary">{waiting.length}</span>}
        </div>
        {pending.loading ? (
          <Skeleton className="h-20 rounded-[18px]" />
        ) : waiting.length === 0 ? (
          <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">No doctors are waiting.</p>
        ) : (
          waiting.map((d) => (
            <PendingDoctorRow key={d.id} doctor={d} busy={busyId === d.id} onVerify={() => act(() => api.admin.verifyDoctor(d.id), d.id)} onSuspend={() => act(() => api.admin.suspendDoctor(d.id), d.id)} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-headline-md font-extrabold text-ink">Clinician directory</h2>
            <p className="text-caption text-ink-muted">Search verified clinicians by name, location, or specialty.</p>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent">{filtered.length} shown</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-warm-white px-3">
            <Icon name="search" className="text-ink-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, location, specialty" className="min-w-0 flex-1 bg-transparent text-body-md outline-none" aria-label="Search clinician directory" />
          </label>
          <select value={specialization} onChange={(event) => setSpecialization(event.target.value)} className="h-12 rounded-xl border border-border bg-warm-white px-3 text-body-md text-ink" aria-label="Filter by specialty">
            <option value="all">All specialties</option>
            {specialties.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        {verified.loading ? (
          <Skeleton className="h-20 rounded-[18px]" />
        ) : filtered.length === 0 ? (
          <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">{working.length ? "No clinicians match those filters." : "No verified clinicians are listed yet."}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-[18px] border border-border bg-warm-white p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(d.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-ink">{d.full_name}</p>
                  <p className="truncate text-caption text-ink-muted">{d.specialization_names?.join(" · ") || "Specialty not listed"}</p>
                  <p className="truncate text-caption text-ink-muted">{d.location || "Location not listed"}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-bold text-accent"><Icon name="check_circle" className="text-[14px]" /> Working</span>
                </div>
                <button onClick={() => act(() => api.admin.suspendDoctor(d.id), d.id)} disabled={busyId === d.id} className="grid h-10 w-10 place-items-center rounded-full border-2 border-border text-error disabled:opacity-50" aria-label="Suspend">
                  <Icon name="block" className="text-[18px]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
