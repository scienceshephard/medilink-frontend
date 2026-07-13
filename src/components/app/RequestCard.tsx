"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, severityTone, titleCase } from "@/lib/format";
import type { DoctorRequest } from "@/lib/types";

export function RequestCard({
  request,
  busy,
  onAccept,
  onDecline,
}: {
  request: DoctorRequest;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const urgent = request.severity === "severe";

  return (
    <article
      className={[
        "rounded-xl border border-outline-variant/40 border-l-4 bg-surface-container-lowest p-md shadow-card",
        urgent ? "border-l-error" : request.severity === "moderate" ? "border-l-tertiary" : "border-l-success",
      ].join(" ")}
    >
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <Avatar name={`P${request.patient_id}`} size={56} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-lg font-semibold text-on-surface">
              Patient #{request.patient_id}
            </p>
            {request.severity && (
              <StatusBadge tone={severityTone(request.severity)}>
                {titleCase(request.severity)}
              </StatusBadge>
            )}
            <StatusBadge tone="neutral">
              {request.mode === "video" ? "Video" : "In-person"}
            </StatusBadge>
          </div>

          <p className="mt-1 flex items-center gap-1 text-label-md text-on-surface-variant">
            <Icon name="calendar_today" className="text-base" />
            {formatDateTime(request.scheduled_datetime)}
          </p>
        </div>
      </div>

      {request.symptom_input && (
        <p className="mt-3 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface-variant">
          <Icon name="medical_information" className="mr-1 align-middle text-[18px] text-secondary" />
          {request.symptom_input}
        </p>
      )}

      <p
        className={[
          "mt-3 flex items-center gap-2 rounded-lg px-4 py-3 text-label-md",
          urgent
            ? "bg-error-container text-on-error-container"
            : "bg-warning-container text-on-warning-container",
        ].join(" ")}
      >
        <Icon name="hourglass_top" className="text-[20px]" />
        <span>
          Respond within <Countdown deadline={request.respond_by} /> — otherwise this goes to
          another doctor.
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" loading={busy} onClick={onAccept}>
          <Icon name="check" className="text-base" />
          Accept
        </Button>
        <Button variant="outline" disabled={busy} onClick={onDecline}>
          <Icon name="close" className="text-base" />
          Decline
        </Button>
      </div>
    </article>
  );
}
