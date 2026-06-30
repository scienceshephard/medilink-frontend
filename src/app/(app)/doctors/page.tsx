"use client";

import { useState } from "react";
import Link from "next/link";
import { DoctorCard } from "@/components/app/DoctorCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";

function DirectorySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card">
          <div className="flex items-start gap-4">
            <Skeleton className="h-[52px] w-[52px] rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant pt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DoctorsPage() {
  const { data, loading, error, reload } = useApi(() => api.doctors.list(), []);
  const [q, setQ] = useState("");

  const doctors = (data ?? []).filter((d) => {
    const hay = `${d.full_name} ${d.bio ?? ""} ${d.location ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1 text-caption text-on-surface-variant">
          <Link href="/dashboard" className="hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Icon name="chevron_right" className="text-[16px] text-outline" />
          <span className="text-on-surface">Find a Doctor</span>
        </nav>
        <h1 className="text-headline-lg text-on-surface">Find a Doctor</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Browse verified specialists and book a consultation that fits your schedule.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8 max-w-lg">
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, bio, or location…"
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Content states */}
      {loading ? (
        <DirectorySkeleton />
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error-container px-6 py-5 text-on-error-container">
          <p className="mb-2 font-semibold">{error}</p>
          <button
            onClick={reload}
            className="inline-flex items-center gap-1 text-label-md font-semibold underline hover:no-underline"
          >
            <Icon name="refresh" className="text-[16px]" />
            Try again
          </button>
        </div>
      ) : doctors.length === 0 ? (
        <EmptyState
          title={q ? "No results found" : "No doctors available yet"}
          description={
            q
              ? `No providers match "${q}". Try a different search term.`
              : "Once providers are verified by an administrator they will appear here."
          }
        />
      ) : (
        <>
          <p className="mb-4 text-caption text-on-surface-variant">
            {doctors.length} provider{doctors.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
