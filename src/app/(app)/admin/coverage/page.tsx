"use client";

import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export default function RecommendationCoveragePage() {
  const coverage = useApi(() => api.admin.recommendationCoverage(), []);
  const maxShare = Math.max(0.01, ...(coverage.data?.items.map((item) => item.first_choice_share) ?? []));

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption font-extrabold uppercase tracking-wide text-primary">Matching quality</p>
          <h1 className="mt-1 text-headline-lg-mobile font-extrabold text-ink md:text-headline-lg">Specialty coverage</h1>
          <p className="text-body-md text-ink-muted">Review clinician coverage and how often each specialty appears in recommendations.</p>
        </div>
        <button onClick={coverage.reload} className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-border px-4 font-bold text-primary"><Icon name="refresh" /> Refresh</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-border bg-warm-white p-5"><p className="text-caption text-ink-muted">Recommendations recorded</p>{coverage.loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 text-display-lg font-extrabold text-ink">{coverage.data?.recommendation_count ?? 0}</p>}</div>
        <div className="rounded-[18px] border border-border bg-warm-white p-5"><p className="text-caption text-ink-muted">Specialties tracked</p>{coverage.loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 text-display-lg font-extrabold text-ink">{coverage.data?.items.length ?? 0}</p>}</div>
      </div>

      {coverage.error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{coverage.error}</p>}
      <div className="flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-caption text-ink-muted"><Icon name="info" className="text-primary" />First-choice share is a descriptive measure, not a quality score. It depends on the specialties doctors list and the recommendation history; it does not assess clinical correctness.</div>

      {coverage.loading ? <div className="flex flex-col gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-24 rounded-[18px]" />)}</div> : (coverage.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-[18px] border border-border bg-warm-white p-6 text-body-md text-ink-muted">No specialties are configured yet.</div>
      ) : (
        <section className="overflow-hidden rounded-[20px] border border-border bg-warm-white" aria-label="Specialty recommendation coverage">
          <ul className="divide-y divide-border">
            {coverage.data?.items.map((item) => (
              <li key={item.specialty} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_140px_180px] sm:items-center sm:p-5">
                <div className="min-w-0"><p className="font-extrabold text-ink">{item.specialty}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(item.first_choice_share > 0 ? 3 : 0, (item.first_choice_share / maxShare) * 100)}%` }} /></div></div>
                <p className="text-caption text-ink-muted"><strong className="text-ink">{item.active_doctors}</strong> active clinicians</p>
                <p className="text-caption text-ink-muted"><strong className="text-ink">{item.first_choice_count}</strong> first choices · <strong className="text-ink">{(item.first_choice_share * 100).toFixed(1)}%</strong> share</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
