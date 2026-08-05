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
        <h2 className="text-headline-md font-extrabold text-ink">Working doctors</h2>
        {verified.loading ? (
          <Skeleton className="h-20 rounded-[18px]" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {working.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-[18px] border border-border bg-warm-white p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(d.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-ink">{d.full_name}</p>
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
