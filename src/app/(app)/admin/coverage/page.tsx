"use client";

import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export default function RecommendationCoveragePage() {
  const coverage = useApi(() => api.admin.recommendationCoverage(), []);
  const facilities = useApi(() => api.admin.facilityDirectoryCoverage(), []);
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

      <section className="rounded-[20px] border border-border bg-warm-white p-5 sm:p-6" aria-labelledby="facility-data-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-caption font-extrabold uppercase tracking-wide text-primary">Facility matching data</p><h2 id="facility-data-heading" className="mt-1 text-headline-md font-extrabold text-ink">Directory coverage and capability gaps</h2></div>
          <button onClick={facilities.reload} className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-border px-4 text-caption font-bold text-primary"><Icon name="refresh" /> Refresh</button>
        </div>
        {facilities.error && <p role="alert" className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{facilities.error}</p>}
        {facilities.loading ? <Skeleton className="mt-4 h-24 rounded-[16px]" /> : facilities.data && <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Facility listings", facilities.data.facility_count.toLocaleString()], ["States/FCT", String(facilities.data.state_count)], ["Distinct state/LGA labels", facilities.data.lga_count.toLocaleString()], ["Coordinate coverage", `${(facilities.data.coordinate_coverage * 100).toFixed(1)}%`]].map(([label, value]) => <div key={label} className="rounded-[14px] bg-[#F5F4EF] p-3"><p className="text-[11px] text-[#65756F]">{label}</p><p className="mt-1 text-[20px] font-extrabold text-[#19352E]">{value}</p></div>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {[["Recommendation runs with facilities", facilities.data.facility_recommendation_count.toLocaleString()], ["Facility listings shown", facilities.data.facility_exposure_count.toLocaleString()], ["Distinct facilities shown", facilities.data.distinct_facilities_recommended.toLocaleString()]].map(([label, value]) => <div key={label} className="rounded-[14px] border border-[#E4E9E5] p-3"><p className="text-[11px] text-[#65756F]">{label}</p><p className="mt-1 text-[18px] font-extrabold text-[#19352E]">{value}</p></div>)}
          </div>
          <div className="mt-3 rounded-xl border border-[#E4E9E5] p-4 text-[12px] leading-5 text-[#65756F]">
            <p><strong className="text-[#19352E]">Equipment data:</strong> {facilities.data.facilities_with_equipment_data} facilities have equipment recorded. <strong className="text-[#19352E]">Service data:</strong> {facilities.data.facilities_with_service_data} facilities have services recorded. <strong className="text-[#19352E]">Verified capabilities:</strong> {facilities.data.facilities_with_verified_capabilities}.</p>
            <p className="mt-2">{facilities.data.interpretation}</p>
          </div>
          {facilities.data.top_first_choice_facilities.length > 0 && <div className="mt-4"><p className="text-caption font-extrabold text-ink">Most frequent first-listed facilities</p><ul className="mt-2 grid gap-2 sm:grid-cols-2">{facilities.data.top_first_choice_facilities.map((facility) => <li key={facility.facility_id} className="rounded-xl bg-[#F5F4EF] p-3 text-caption text-ink-muted"><strong className="text-ink">{facility.name}</strong><span className="float-right">{facility.first_choice_count} first-listed</span></li>)}</ul><p className="mt-2 text-[10px] text-ink-muted">First-listed counts describe exposure, not patient preference or clinical quality.</p></div>}
        </>}
      </section>

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
