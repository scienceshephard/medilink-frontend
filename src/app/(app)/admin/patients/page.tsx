"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResetLinkButton } from "@/components/app/ResetLinkButton";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";

export default function AdminPatientsPage() {
  const patients = useApi(() => api.admin.allPatients(), []);
  const [query, setQuery] = useState("");

  const all = patients.data ?? [];
  const filtered = all.filter((p) =>
    `${p.name} ${p.email} ${p.location ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Patients</h1>
        <p className="text-body-md text-ink-muted">{all.length} patient accounts</p>
      </div>

      {patients.error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">Could not load patients.</p>}

      <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-warm-white px-3">
        <Icon name="search" className="text-ink-muted" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, location, phone" className="min-w-0 flex-1 bg-transparent text-body-md outline-none" aria-label="Search patients" />
      </label>

      {patients.loading ? (
        <Skeleton className="h-20 rounded-[18px]" />
      ) : filtered.length === 0 ? (
        <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">{all.length ? "No patients match that search." : "No patients have signed up yet."}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-[18px] border border-border bg-warm-white p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(p.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-ink">{p.name}</p>
                <p className="truncate text-caption text-ink-muted">{p.email}</p>
                <p className="truncate text-caption text-ink-muted">{p.location || "Location not listed"} · Joined {formatDate(p.created_at)}</p>
                <p className="text-caption text-ink-muted">{p.consultation_count} consultation{p.consultation_count === 1 ? "" : "s"}</p>
                {!p.is_active && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-soft px-2.5 py-0.5 text-caption font-bold text-error"><Icon name="block" className="text-[14px]" /> Suspended</span>}
                <div className="mt-2"><ResetLinkButton role="patient" id={p.id} name={p.name} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
