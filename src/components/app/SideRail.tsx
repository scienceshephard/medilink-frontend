"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/ui/Icon";
import { navItemsFor, Role } from "./navItems";
import { useActiveHref } from "./useActiveHref";
import { cn } from "@/components/ui/cn";

function displayName(role: Role | null): Promise<string> {
  if (role === "patient") return api.patients.me().then((me) => me.full_name.split(/\s+/)[0]);
  if (role === "doctor") return api.doctors.me().then((me) => me.full_name);
  if (role === "clinic") return api.clinics.me().then((me) => me.name);
  return Promise.resolve("Admin");
}

export function SideRail() {
  const { role, logout } = useAuth();
  const items = navItemsFor((role as Role) ?? "patient");
  const current = useActiveHref(items);
  const name = useApi(() => displayName(role as Role | null), [role]);
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-border bg-warm-white px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary">
          <Icon name="favorite" fill className="text-[20px]" />
        </span>
        <span className="text-[20px] font-extrabold text-ink">MediLink</span>
      </Link>
      {items.map((it) => {
        const active = current === it.href;
        return (
          <Link
            key={it.label}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-12 shrink-0 items-center gap-3 rounded-xl px-3.5 text-[16px] transition-colors",
              active ? "bg-primary-soft font-extrabold text-primary" : "font-semibold text-ink-muted hover:bg-primary-soft/40 hover:text-ink",
            )}
          >
            <Icon name={it.icon} fill={active} className="text-[24px]" />
            {it.label}
          </Link>
        );
      })}
      <div className="mt-auto flex items-center gap-2.5 px-2 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon name="person" className="text-[22px]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">{name.data ?? ""}</span>
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-red-soft hover:text-error"
        >
          <Icon name="logout" className="text-[20px]" />
        </button>
      </div>
    </aside>
  );
}
