"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import type { DoctorOut } from "@/lib/types";

type Step = { done: boolean; title: string; detail: string; action?: React.ReactNode };

/**
 * What a doctor still has to do before patients can book them.
 *
 * Patients are only recommended doctors who are verified (or marked demo) and
 * have at least one open future time, so each unmet condition here is a reason
 * the doctor is invisible. Hidden once everything is in place.
 */
export function SetupChecklist({
  doctor,
  onAddTimes,
}: {
  doctor: DoctorOut;
  onAddTimes: () => void;
}) {
  const verified = doctor.verification_status === "verified" || Boolean(doctor.is_demo);
  const suspended = doctor.verification_status === "suspended";
  const hasLicense = Boolean(doctor.licensing_authority && doctor.license_number && doctor.license_expiry);
  const reachable = Boolean(doctor.default_meeting_link || doctor.clinic_address);
  const openSlots = doctor.open_slot_count ?? 0;

  if (suspended) {
    return (
      <section id="setup" className="scroll-mt-6 rounded-[18px] border border-error/30 bg-red-soft p-5">
        <p className="flex items-center gap-2 font-extrabold text-error"><Icon name="block" /> Your account is suspended</p>
        <p className="mt-1 text-[13px] text-[#6B6259]">Patients cannot find or book you. Contact the MediLink team to resolve this.</p>
      </section>
    );
  }

  const profileLink = (label: string) => (
    <Link href="/doctor-profile" className="inline-flex h-9 items-center rounded-full border-2 border-border px-4 text-[13px] font-extrabold text-primary">{label}</Link>
  );

  const steps: Step[] = [
    {
      done: hasLicense,
      title: "License details",
      detail: hasLicense
        ? "Submitted for review."
        : "Add your licensing authority, number and expiry date. An admin cannot approve you without them.",
      action: hasLicense ? undefined : profileLink("Add license"),
    },
    {
      done: verified,
      title: "Admin approval",
      detail: verified
        ? "Approved. Patients can find you."
        : doctor.rejection_reason
          ? `Changes requested: ${doctor.rejection_reason}. Update your license details to resubmit.`
          : "An admin is checking your license with the issuing authority. You can finish the other steps while you wait.",
      action: !verified && doctor.rejection_reason ? profileLink("Update details") : undefined,
    },
    {
      done: reachable,
      title: "How patients reach you",
      detail: reachable
        ? "Meeting link or clinic address saved."
        : "Add a video meeting link or a clinic address so you can accept requests.",
      action: reachable ? undefined : profileLink("Add link or address"),
    },
    {
      done: openSlots > 0,
      title: "Free times",
      detail: openSlots > 0
        ? `${openSlots} open ${openSlots === 1 ? "time" : "times"} patients can book.`
        : "Add at least one free time. Patients are only shown doctors they can book.",
      action: openSlots > 0 ? undefined : (
        <button onClick={onAddTimes} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-extrabold text-on-primary">Add free times</button>
      ),
    },
  ];

  const remaining = steps.filter((s) => !s.done).length;
  if (remaining === 0) return null;

  return (
    <section id="setup" className="scroll-mt-6 rounded-[18px] border border-[#E4D9C7] bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#6B6259]">Getting set up</p>
      <h2 className="mt-1 font-serif text-[26px] text-[#2B2621]">
        {remaining === 1 ? "One step before patients can book you" : `${remaining} steps before patients can book you`}
      </h2>
      <ol className="mt-4 flex flex-col divide-y divide-[#EFE6D8]">
        {steps.map((step) => (
          <li key={step.title} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full",
              step.done ? "bg-[#2E6B4F] text-white" : "border-2 border-[#E4D9C7] text-[#6B6259]",
            )}>
              <Icon name={step.done ? "check" : "schedule"} className="text-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-[#2B2621]">{step.title}</p>
              <p className="text-[13px] text-[#6B6259]">{step.detail}</p>
            </div>
            {step.action}
          </li>
        ))}
      </ol>
    </section>
  );
}
