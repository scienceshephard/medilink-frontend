"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatDateTime, statusTone, titleCase, initials } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackModal } from "@/components/app/FeedbackModal";
import type { ConsultationSummary, DoctorPublicOut } from "@/lib/types";

export default function AppointmentsPage() {
  const {
    data: consultations,
    loading: consultLoading,
    error: consultError,
    reload,
  } = useApi(() => api.patients.consultations(), []);

  const { data: doctors } = useApi(() => api.doctors.list(), []);

  const [feedbackId, setFeedbackId] = useState<number | null>(null);

  // Build a doctor id → name map
  const doctorMap: Record<number, string> = {};
  if (doctors) {
    for (const d of doctors as DoctorPublicOut[]) {
      doctorMap[d.id] = d.full_name;
    }
  }

  function doctorName(c: ConsultationSummary): string {
    if (c.doctor_id != null && doctorMap[c.doctor_id]) {
      return doctorMap[c.doctor_id];
    }
    return c.doctor_id != null ? `Doctor #${c.doctor_id}` : "Unknown Doctor";
  }

  const items = consultations ?? [];

  return (
    <>
      {/* Page header */}
      <header className="mb-8">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          My Appointments
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Track your consultations, review completed visits, and share feedback.
        </p>
      </header>

      {/* Content */}
      {consultLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : consultError ? (
        <p className="rounded-xl border border-error-container bg-error-container px-5 py-4 text-body-md text-on-error-container">
          {consultError}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Book a consultation to get started. Your upcoming and past appointments will appear here."
          action={
            <Link href="/intake">
              <Button>
                <Icon name="add" className="text-base" />
                New consultation
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((c) => {
            const name = doctorName(c);
            return (
              <Card key={c.id} hover>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Avatar */}
                  <Avatar name={name} size={48} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-lg font-semibold text-on-surface">
                        {name}
                      </p>
                      <StatusBadge tone={statusTone(c.status)}>
                        {titleCase(c.status)}
                      </StatusBadge>
                    </div>

                    {c.symptom_input && (
                      <p className="mt-0.5 truncate text-body-md text-on-surface-variant">
                        {c.symptom_input}
                      </p>
                    )}

                    <p className="mt-1 flex items-center gap-1 text-label-md text-on-surface-variant">
                      <Icon name="schedule" className="text-base" />
                      {formatDateTime(c.scheduled_datetime)}
                    </p>
                  </div>

                  {/* Actions */}
                  {c.status === "completed" && (
                    <div className="shrink-0">
                      <Button
                        variant="secondary"
                        onClick={() => setFeedbackId(c.id)}
                      >
                        <Icon name="rate_review" className="text-base" />
                        Leave feedback
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback modal */}
      {feedbackId != null && (
        <FeedbackModal
          consultationId={feedbackId}
          open={feedbackId != null}
          onClose={() => setFeedbackId(null)}
          onSubmitted={() => {
            setFeedbackId(null);
            reload();
          }}
        />
      )}
    </>
  );
}
