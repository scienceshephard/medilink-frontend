"use client";

import { useState } from "react";
import { DoctorCard } from "@/components/app/DoctorCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";

export default function DoctorsPage() {
  const { data, loading, error } = useApi(() => api.doctors.list(), []);
  const [q, setQ] = useState("");

  const doctors = (data ?? []).filter((d) => {
    const hay = `${d.full_name} ${d.bio ?? ""} ${d.location ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Find a doctor</h1>
        <p className="text-body-md text-ink-muted">Browse doctors and book a visit that fits you.</p>
      </div>

      <div className="flex h-12 items-center gap-3 rounded-full border border-border bg-warm-white px-5">
        <Icon name="search" className="text-ink-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or place…"
          className="h-full w-full bg-transparent text-body-md text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-52 rounded-[20px]" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error}</p>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Icon name="person_search" className="text-[40px] text-ink-muted" />
          <p className="font-extrabold text-ink">No doctors found</p>
          <p className="text-body-md text-ink-muted">Try a different name.</p>
        </div>
      ) : (
        <>
          <p className="text-caption text-ink-muted">{doctors.length} doctor{doctors.length !== 1 ? "s" : ""}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
