"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/format";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header card skeleton */}
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2 flex-wrap">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex gap-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
      {/* Body skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function DoctorProfilePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { data: doctor, loading, error, reload } = useApi(() => api.doctors.get(id), [id]);

  if (loading) return <ProfileSkeleton />;

  if (error || !doctor) {
    return (
      <div className="rounded-xl border border-error/30 bg-error-container px-6 py-5 text-on-error-container">
        <p className="mb-2 font-semibold">{error || "Doctor not found."}</p>
        <button
          onClick={reload}
          className="inline-flex items-center gap-1 text-label-md font-semibold underline hover:no-underline"
        >
          <Icon name="refresh" className="text-[16px]" />
          Try again
        </button>
      </div>
    );
  }

  const d = doctor;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-caption text-on-surface-variant">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Dashboard
        </Link>
        <Icon name="chevron_right" className="text-[16px] text-outline" />
        <Link href="/doctors" className="hover:text-primary transition-colors">
          Find a Doctor
        </Link>
        <Icon name="chevron_right" className="text-[16px] text-outline" />
        <span className="text-on-surface">{d.full_name}</span>
      </nav>

      {/* Doctor header card — mirrors the stitch left-column layout */}
      <section className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          {/* Initials avatar */}
          <div className="relative shrink-0">
            <Avatar name={d.full_name} size={96} />
          </div>

          {/* Name / chips / meta */}
          <div className="flex-1">
            <h1 className="text-headline-lg text-on-surface">{d.full_name}</h1>

            {/* Rating + board-certified chips */}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-caption text-on-surface">
                <Icon name="star" fill className="text-[16px] text-tertiary" />
                {d.average_rating.toFixed(1)}&nbsp;
                <span className="text-on-surface-variant">
                  ({d.total_consultations} review{d.total_consultations !== 1 ? "s" : ""})
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-caption text-on-surface">
                <Icon name="verified" fill className="text-[16px] text-secondary" />
                Board Certified
              </span>
            </div>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-caption text-on-surface-variant sm:justify-start">
              <span className="flex items-center gap-1.5">
                <Icon name="work_history" className="text-[16px] text-secondary shrink-0" />
                {d.years_experience}+ years experience
              </span>
              {d.location && (
                <span className="flex items-center gap-1.5">
                  <Icon name="location_on" className="text-[16px] text-secondary shrink-0" />
                  {d.location}
                </span>
              )}
              {d.languages.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Icon name="language" className="text-[16px] text-secondary shrink-0" />
                  {d.languages.join(", ")}
                </span>
              )}
            </div>

            {/* Language chips */}
            {d.languages.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {d.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-caption font-semibold text-on-primary-fixed-variant"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Body grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* About section */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="mb-1 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
              About
            </h2>
            <div className="mt-3 border-t border-outline-variant pt-4">
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                {d.bio ||
                  "This provider has not published a bio yet. Their availability and metrics are shown on this page."}
              </p>
            </div>
          </Card>

          {/* Practice stats */}
          <Card className="p-6">
            <h2 className="mb-4 text-headline-md text-on-surface">Practice Overview</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile icon="star" label="Avg. Rating" value={`${d.average_rating.toFixed(1)} / 5`} />
              <StatTile icon="groups" label="Consultations" value={String(d.total_consultations)} />
              <StatTile icon="work_history" label="Experience" value={`${d.years_experience} yrs`} />
            </div>
          </Card>
        </div>

        {/* Booking sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-headline-md text-on-surface">Consultation Fee</h2>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-container-low p-4">
              <span className="flex items-center gap-2 text-body-md text-on-surface-variant">
                <Icon name="payments" className="text-[20px] text-secondary" />
                Per session
              </span>
              <span className="text-headline-md font-bold text-on-surface tabular-nums">
                {formatNaira(d.consultation_fee)}
              </span>
            </div>

            <Link href={`/doctors/${d.id}/book`} className="mt-5 block">
              <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-body-md font-semibold text-on-primary shadow-card transition-colors hover:bg-on-primary-fixed-variant">
                <Icon name="calendar_month" className="text-[20px]" />
                Book Appointment
              </button>
            </Link>

            <p className="mt-3 text-center text-caption text-on-surface-variant">
              No charges until the service is rendered.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

function StatTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-4">
      <Icon name={icon} className="text-[20px] text-secondary" />
      <p className="mt-2 text-headline-md font-bold text-on-surface tabular-nums">{value}</p>
      <p className="text-caption text-on-surface-variant">{label}</p>
    </div>
  );
}
