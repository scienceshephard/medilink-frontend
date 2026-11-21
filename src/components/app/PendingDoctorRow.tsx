"use client";

import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import type { PendingDoctor } from "@/lib/types";
import { initials } from "@/lib/format";


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
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-warm-white p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft font-extrabold text-primary">
        {initials(doctor.name)}
      </span>
      <Link href={`/admin/doctors/${doctor.id}`} className="min-w-0 flex-1 rounded-lg hover:opacity-80">
        <p className="truncate text-[16px] font-extrabold text-ink">{doctor.name}</p>
        <p className="truncate text-[13px] text-ink-muted">
          {doctor.qualifications || doctor.licensing_authority || "No details listed"}{doctor.license_number ? ` · ${doctor.license_number}` : ""}
        </p>
        <p className="text-[13px] font-bold text-primary">{doctor.credentials_complete ? "Review licence" : "Licence details missing"}</p>
      </Link>
      <button onClick={onVerify} disabled={busy || !doctor.credentials_complete} aria-label={`Verify ${doctor.name}`} title={doctor.credentials_complete ? "Verify" : "Licence details missing"} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-on-primary disabled:opacity-40">
        <Icon name="check" className="text-[22px]" />
      </button>
      <button onClick={() => { if (window.confirm(`Suspend ${doctor.name}? They will not be able to sign in or appear to patients until you reinstate them from the Doctors page.`)) onSuspend(); }} disabled={busy} aria-label={`Suspend ${doctor.name}`} title="Suspend" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-warm-white text-ink-muted hover:bg-red-soft hover:text-error disabled:opacity-50">
        <Icon name="close" className="text-[22px]" />
      </button>
    </div>
  );
}
