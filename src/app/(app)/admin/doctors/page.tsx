"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { PendingDoctorRow } from "@/components/app/PendingDoctorRow";
import { ResetLinkButton } from "@/components/app/ResetLinkButton";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { AdminDoctorRow } from "@/lib/types";

const STATUS_FILTERS = [
  ["all", "All"],
  ["working", "Working"],
  ["pending", "Waiting"],
  ["suspended", "Suspended"],
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number][0];

function accountStatus(d: AdminDoctorRow): Exclude<StatusFilter, "all"> {
  if (d.verification_status === "suspended" || !d.is_active) return "suspended";
  if (d.verification_status === "verified" || d.is_demo) return "working";
  return "pending";
}


export default function AdminDoctorsPage() {
  const pending = useApi(() => api.admin.pendingDoctors(), []);
  const everyone = useApi(() => api.admin.allDoctors(), []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [specialization, setSpecialization] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function act(fn: () => Promise<unknown>, id: number) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      pending.reload();
      everyone.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const waiting = pending.data ?? [];
  const all = everyone.data ?? [];
  const working = all.filter((doctor) => accountStatus(doctor) === "working");
  const suspendedCount = all.filter((doctor) => accountStatus(doctor) === "suspended").length;
  const specialties = Array.from(new Set(all.flatMap((doctor) => doctor.specializations ?? []))).sort();
  const filtered = all.filter((doctor) => {
    const text = `${doctor.name} ${doctor.email} ${doctor.location ?? ""} ${(doctor.specializations ?? []).join(" ")}`.toLowerCase();
    return text.includes(query.trim().toLowerCase())
      && (specialization === "all" || doctor.specializations?.includes(specialization))
      && (statusFilter === "all" || accountStatus(doctor) === statusFilter);
  });

  function suspend(d: AdminDoctorRow) {
    if (!window.confirm(`Suspend ${d.name}? They will not be able to sign in or appear to patients until you reinstate them.`)) return;
    act(() => api.admin.suspendDoctor(d.id), d.id);
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Doctors</h1>
        <p className="text-body-md text-ink-muted">{all.length} accounts · {working.length} working · {waiting.length} waiting to join{suspendedCount ? ` · ${suspendedCount} suspended` : ""}</p>
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
            <h2 className="text-headline-md font-extrabold text-ink">All doctor accounts</h2>
            <p className="text-caption text-ink-muted">Every doctor account, including demo, waiting and suspended ones.</p>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent">{filtered.length} shown</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-warm-white px-3">
            <Icon name="search" className="text-ink-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, location, specialty" className="min-w-0 flex-1 bg-transparent text-body-md outline-none" aria-label="Search clinician directory" />
          </label>
          <select value={specialization} onChange={(event) => setSpecialization(event.target.value)} className="h-12 rounded-xl border border-border bg-warm-white px-3 text-body-md text-ink" aria-label="Filter by specialty">
            <option value="all">All specialties</option>
            {specialties.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by account status">
          {STATUS_FILTERS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)} className={`rounded-full border px-4 py-1.5 text-caption font-bold ${statusFilter === value ? "border-primary bg-primary text-on-primary" : "border-border bg-warm-white text-ink-muted"}`}>{label}</button>
          ))}
        </div>
        {everyone.loading ? (
          <Skeleton className="h-20 rounded-[18px]" />
        ) : filtered.length === 0 ? (
          <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">{all.length ? "No doctors match those filters." : "No doctor accounts yet."}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((d) => {
              const status = accountStatus(d);
              return (
              <div key={d.id} className="flex items-center gap-3 rounded-[18px] border border-border bg-warm-white p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(d.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-ink">{d.name}</p>
                  <p className="truncate text-caption text-ink-muted">{d.email}</p>
                  <p className="truncate text-caption text-ink-muted">{d.specializations?.join(" · ") || "Specialty not listed"} · {d.location || "Location not listed"}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {status === "working" && <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-bold text-accent"><Icon name="check_circle" className="text-[14px]" /> Working</span>}
                    {status === "pending" && <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-caption font-bold text-ink-muted"><Icon name="schedule" className="text-[14px]" /> Waiting</span>}
                    {status === "suspended" && <span className="inline-flex items-center gap-1 rounded-full bg-red-soft px-2.5 py-0.5 text-caption font-bold text-error"><Icon name="block" className="text-[14px]" /> Suspended</span>}
                    {d.is_demo && <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-caption font-bold text-ink-muted">Demo</span>}
                  </div>
                  <div className="mt-2"><ResetLinkButton role="doctor" id={d.id} name={d.name} /></div>
                </div>
                {status === "suspended" ? (
                  <button onClick={() => act(() => api.admin.reinstateDoctor(d.id), d.id)} disabled={busyId === d.id} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-accent px-4 text-caption font-extrabold text-on-primary disabled:opacity-50">
                    <Icon name="undo" className="text-[16px]" /> Reinstate
                  </button>
                ) : (
                  <button onClick={() => suspend(d)} disabled={busyId === d.id} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border-2 border-border px-4 text-caption font-extrabold text-error disabled:opacity-50">
                    <Icon name="block" className="text-[16px]" /> Suspend
                  </button>
                )}
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
