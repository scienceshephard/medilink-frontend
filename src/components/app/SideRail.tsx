"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { navItemsFor, Role } from "./navItems";
import { cn } from "@/components/ui/cn";

export function SideRail() {
  const pathname = usePathname();
  const { role, logout } = useAuth();
  const items = navItemsFor((role as Role) ?? "patient");
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-1.5 border-r border-border bg-warm-white p-4 md:flex">
      <div className="flex items-center gap-2.5 px-2 py-2 pb-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary">
          <Icon name="favorite" fill />
        </span>
        <span className="text-headline-md font-extrabold text-ink">MediLink</span>
      </div>
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.label}
            href={it.href}
            className={cn(
              "flex h-12 items-center gap-3 rounded-xl px-3.5 font-bold",
              active ? "bg-primary-soft text-primary" : "text-ink-muted hover:bg-primary-soft/40",
            )}
          >
            <Icon name={it.icon} fill={active} />
            {it.label}
          </Link>
        );
      })}
      <div className="mt-auto">
        <button
          onClick={logout}
          className="flex h-12 w-full items-center gap-3 rounded-xl px-3.5 font-bold text-ink-muted hover:bg-red-soft hover:text-error"
        >
          <Icon name="logout" />
          Log out
        </button>
      </div>
    </aside>
  );
}
