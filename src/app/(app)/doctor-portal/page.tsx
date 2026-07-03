"use client";

import { useState, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { AvailabilityForm } from "@/components/app/AvailabilityForm";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, statusTone, titleCase } from "@/lib/format";
import type { ConsultationSummary } from "@/lib/types";

export default function DoctorPortalPage() {
  const doctor = useApi(() => api.doctors.me(), []);
  const metrics = useApi(() => api.doctors.myMetrics(), []);
  const consults = useApi(() => api.doctors.myConsultations(), []);

  const [availOpen, setAvailOpen] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ConsultationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Derive greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Extract last name from full_name (e.g. "Dr. Jane Smith" → "Smith")
  const lastName = doctor.data
    ? doctor.data.full_name.trim().split(" ").filter(Boolean).pop() ?? doctor.data.full_name
    : null;

  const todayConsults = (consults.data ?? []).filter((c) => {
    const d = new Date(c.scheduled_datetime);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  const reloadConsults = useCallback(() => {
    consults.reload();
    metrics.reload();
  }, [consults, metrics]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markCompleted(id: number) {
    setCompleting(id);
    setCompleteError(null);
    try {
      await api.consultations.update(id, { status: "completed" });
      consults.reload();
      metrics.reload();
    } catch (err) {
      setCompleteError(err instanceof ApiError ? err.message : "Could not mark consultation as completed.");
    } finally {
      setCompleting(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.consultations.cancel(cancelTarget.id);
      setCancelTarget(null);
      reloadConsults();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        {doctor.loading ? (
          <Skeleton className="h-10 w-64 mb-2" />
        ) : (
          <h1 className="text-headline-lg text-on-surface">
            {greeting}{lastName ? `, Dr. ${lastName}` : ""}
          </h1>
        )}
        <p className="mt-1 text-body-md text-on-surface-variant">
          {consults.loading ? (
            <Skeleton className="h-5 w-48 inline-block" />
          ) : (
            <>
              You have{" "}
              <span className="font-bold text-primary">
                {todayConsults.length} consultation{todayConsults.length !== 1 ? "s" : ""}
              </span>{" "}
              today · {(consults.data ?? []).length} total
            </>
          )}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        {metrics.loading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : metrics.error ? (
          <p className="col-span-3 text-error text-body-md">{metrics.error}</p>
        ) : (
          <>
            <MetricCard
              icon="star"
              label="Average rating"
              value={metrics.data ? `${metrics.data.average_rating.toFixed(1)} / 5` : "—"}
              sub="Based on patient feedback"
            />
            <MetricCard
              icon="groups"
              label="Total consultations"
              value={metrics.data ? metrics.data.total_consultations : "—"}
              sub="All time"
            />
            <MetricCard
              icon="trending_up"
              label="Acceptance rate"
              value={
                metrics.data
                  ? `${Math.round(metrics.data.recommendation_acceptance_rate * 100)}%`
                  : "—"
              }
              sub="AI recommendation acceptance"
            />
          </>
        )}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* Patient queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md text-on-surface">Patient Queue</h2>
          </div>

          {completeError && (
            <p className="mb-4 rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
              {completeError}
            </p>
          )}

          {consults.loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : consults.error ? (
            <p className="text-error text-body-md">{consults.error}</p>
          ) : (consults.data ?? []).length === 0 ? (
            <EmptyState
              title="No consultations yet"
              description="Add availability slots so patients can schedule with you."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {(consults.data ?? []).map((c) => (
                <article
                  key={c.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-card p-md flex flex-col sm:flex-row sm:items-center gap-md hover:shadow-modal transition-shadow"
                >
                  {/* Initials avatar — no patient names exposed to doctor */}
                  <Avatar
                    name={`P${c.patient_id ?? c.id}`}
                    size={56}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-md font-semibold text-on-surface">
                        Patient #{c.patient_id ?? "—"} · Consult #{c.id}
                      </p>
                      <StatusBadge tone={statusTone(c.status)}>
                        {titleCase(c.status)}
                      </StatusBadge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-caption text-on-surface-variant">
                      <Icon name="calendar_today" className="text-[16px]" />
                      <span>{formatDateTime(c.scheduled_datetime)}</span>
                    </div>
                    {c.symptom_input && (
                      <p className="mt-2 truncate text-caption text-on-surface-variant">
                        <Icon name="medical_information" className="text-[15px] align-middle mr-1" />
                        {c.symptom_input}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {c.status === "scheduled" && (
                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                      <Button
                        size="md"
                        variant="primary"
                        loading={completing === c.id}
                        onClick={() => markCompleted(c.id)}
                      >
                        <Icon name="check_circle" className="text-[18px]" />
                        Mark completed
                      </Button>
                      {new Date(c.scheduled_datetime) > new Date() && (
                        <Button
                          size="md"
                          variant="outline"
                          onClick={() => setCancelTarget(c)}
                        >
                          <Icon name="close" className="text-[18px]" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: availability */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-card p-md">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="event_available" className="text-primary text-[22px]" />
              <h3 className="text-headline-md text-on-surface">Availability</h3>
            </div>
            <p className="text-caption text-on-surface-variant mb-5">
              Add open slots so patients can book consultations with you.
            </p>
            <Button
              variant="primary"
              full
              onClick={() => setAvailOpen(true)}
            >
              <Icon name="add" className="text-[18px]" />
              Add availability
            </Button>
          </div>

          {/* Recent activity summary */}
          {!metrics.loading && metrics.data && (
            <div className="mt-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-card p-md">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="insights" className="text-secondary text-[20px]" />
                <h3 className="text-label-md text-on-surface">Quick stats</h3>
              </div>
              <dl className="flex flex-col gap-2">
                <div className="flex justify-between text-caption">
                  <span className="text-on-surface-variant">Today&apos;s consultations</span>
                  <span className="font-semibold text-on-surface">{todayConsults.length}</span>
                </div>
                <div className="flex justify-between text-caption">
                  <span className="text-on-surface-variant">Scheduled</span>
                  <span className="font-semibold text-on-surface">
                    {(consults.data ?? []).filter((c) => c.status === "scheduled").length}
                  </span>
                </div>
                <div className="flex justify-between text-caption">
                  <span className="text-on-surface-variant">Completed</span>
                  <span className="font-semibold text-on-surface">
                    {(consults.data ?? []).filter((c) => c.status === "completed").length}
                  </span>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>

      {/* Availability modal */}
      <Modal
        open={availOpen}
        onClose={() => setAvailOpen(false)}
        title="Add availability slot"
      >
        <AvailabilityForm
          onAdded={() => {
            setAvailOpen(false);
            reloadConsults();
          }}
        />
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal
        open={cancelTarget != null}
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
        title="Cancel this consultation?"
      >
        {cancelTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-on-surface-variant">
              Cancel the consultation scheduled for{" "}
              <span className="font-semibold text-on-surface">
                {formatDateTime(cancelTarget.scheduled_datetime)}
              </span>
              ? The patient will be refunded automatically if they paid, and the slot is freed.
            </p>

            {cancelError && (
              <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {cancelError}
              </p>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelError(null);
                }}
              >
                Keep it
              </Button>
              <Button
                variant="primary"
                className="!bg-error text-on-error hover:!bg-error/90"
                loading={cancelling}
                onClick={handleCancel}
              >
                <Icon name="close" className="text-base" />
                Cancel consultation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
