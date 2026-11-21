"use client";

import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";

/**
 * The "Account" block from the design's Me/Preferences screens. Phones only:
 * on desktop the side rail already carries sign-out.
 */
export function AccountActions() {
  const { logout } = useAuth();
  return (
    <section className="flex flex-col gap-2 md:hidden">
      <h2 className="text-[18px] font-extrabold text-ink">Account</h2>
      <div className="rounded-[20px] border border-border bg-warm-white px-4">
        <button type="button" onClick={logout} className="flex h-14 w-full items-center gap-3 text-[15px] font-bold text-ink">
          <Icon name="logout" className="text-[20px] text-ink-muted" /> Sign out
        </button>
      </div>
    </section>
  );
}
