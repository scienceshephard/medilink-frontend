"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { PendingDoctor } from "@/lib/types";

// A single provider awaiting verification. Rendered inside the admin
// verification queue (replaces the design's fabricated "matching requests"
// table with the real, backend-backed approval workflow).
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
    <div className="flex flex-col gap-md p-md sm:flex-row sm:items-center hover:bg-surface-container-low transition-colors">
      <Avatar name={doctor.name} size={44} />

      <div className="min-w-0 flex-1">
        <p className="text-body-md font-medium text-on-background truncate">
          {doctor.name}
        </p>
        <p className="text-caption text-on-surface-variant truncate">
          <Icon name="mail" className="text-[15px] align-middle mr-1" />
          {doctor.email}
        </p>
        <p className="text-caption text-on-surface-variant truncate">
          <Icon name="school" className="text-[15px] align-middle mr-1" />
          {doctor.qualifications || "No qualifications listed"}
        </p>
      </div>

      <div className="flex flex-shrink-0 gap-sm">
        <Button variant="primary" loading={busy} onClick={onVerify}>
          <Icon name="verified" className="text-[18px]" />
          Verify
        </Button>
        <Button
          variant="outline"
          loading={busy}
          onClick={onSuspend}
          className="border-error/40 text-error hover:bg-error-container"
        >
          <Icon name="block" className="text-[18px]" />
          Suspend
        </Button>
      </div>
    </div>
  );
}
