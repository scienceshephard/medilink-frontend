"use client";

import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/app/PageHeader";

export default function AdminAccountPage() {
  const { logout } = useAuth();
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <PageHeader title="Account" />

      <div className="flex flex-col items-center gap-2 rounded-[20px] border border-border bg-warm-white p-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="admin_panel_settings" className="text-[36px]" /></span>
        <p className="text-body-lg font-extrabold text-ink">Admin</p>
        <p className="text-body-md text-ink-muted">admin@hptrs.com</p>
      </div>

      <div className="flex items-center gap-3 rounded-[18px] bg-accent-soft p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-on-primary"><Icon name="shield_person" /></span>
        <p className="text-body-md font-bold text-ink">You manage doctors and the matching brain.</p>
      </div>

      <button onClick={logout} className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-error font-extrabold text-error">
        <Icon name="logout" /> Log out
      </button>
    </div>
  );
}
