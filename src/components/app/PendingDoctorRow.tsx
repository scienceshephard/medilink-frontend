"use client";

import { Icon } from "@/components/ui/Icon";
import type { PendingDoctor } from "@/lib/types";

function initials(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function PendingDoctorRow({
  doctor,
  busy,
  onVerify,
  onSuspend,
}: {
  doctor: PendingDoctor;
  busy: boolean;
  onVerify: () => void;
  onSuspend: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-warm-white p-4 sm:flex-row sm:items-center">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">
        {initials(doctor.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-ink">{doctor.name}</p>
        <p className="truncate text-caption text-ink-muted">
          <Icon name="mail" className="mr-1 align-middle text-[15px]" />{doctor.email}
        </p>
        <p className="truncate text-caption text-ink-muted">
          <Icon name="school" className="mr-1 align-middle text-[15px]" />{doctor.qualifications || "No details listed"}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={onVerify} disabled={busy} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 font-extrabold text-on-primary disabled:opacity-50">
          <Icon name="check" className="text-[18px]" /> Verify
        </button>
        <button onClick={onSuspend} disabled={busy} className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-5 font-extrabold text-error disabled:opacity-50">
          <Icon name="block" className="text-[18px]" /> Reject
        </button>
      </div>
    </div>
  );
}
