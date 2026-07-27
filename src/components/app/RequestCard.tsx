"use client";

import { Countdown } from "@/components/ui/Countdown";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime, titleCase } from "@/lib/format";
import type { DoctorRequest } from "@/lib/types";
import { cn } from "@/components/ui/cn";

const SEV: Record<string, { icon: string; color: string; soft: string; border: string }> = {
  severe: { icon: "sentiment_very_dissatisfied", color: "text-face-worse", soft: "bg-red-soft", border: "border-l-face-worse" },
  moderate: { icon: "sentiment_neutral", color: "text-face-same", soft: "bg-amber-soft", border: "border-l-face-same" },
  mild: { icon: "sentiment_satisfied", color: "text-face-better", soft: "bg-accent-soft", border: "border-l-face-better" },
};

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
  const sev = SEV[(request.severity ?? "moderate").toLowerCase()] ?? SEV.moderate;

  return (
    <article className={cn("flex flex-col gap-3 rounded-[20px] border border-border border-l-4 bg-warm-white p-5", sev.border)}>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand text-ink-muted">
          <Icon name="person" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">A patient</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {request.severity && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold", sev.soft, sev.color)}>
                <Icon name={sev.icon} className="text-[15px]" /> {titleCase(request.severity)}
              </span>
            )}
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-caption font-bold text-ink-muted">
              {request.mode === "video" ? "Video" : "In person"}
            </span>
          </div>
        </div>
        <span className="hidden text-caption text-ink-muted sm:block">{formatDateTime(request.scheduled_datetime)}</span>
      </div>

      {request.symptom_input && (
        <p className="flex items-start gap-2 rounded-xl bg-sand px-4 py-3 text-body-md text-ink">
          <Icon name="format_quote" className="text-ink-muted" />
          {request.symptom_input}
        </p>
      )}

      <p className="flex items-center gap-2 text-caption font-bold text-face-worse">
        <Icon name="hourglass_top" className="text-[18px]" />
        Answer in <Countdown deadline={request.respond_by} /> — or it goes to another doctor.
      </p>

      <div className="flex gap-2.5">
        <button
          onClick={onAccept}
          disabled={busy}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent font-extrabold text-on-primary disabled:opacity-50"
        >
          <Icon name="check" /> Yes, accept
        </button>
        <button
          onClick={onDecline}
          disabled={busy}
          className="inline-flex h-12 items-center justify-center rounded-full border-2 border-border px-6 font-extrabold text-ink-muted disabled:opacity-50"
        >
          No
        </button>
      </div>
    </article>
  );
}
