"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { navItemsFor, Role } from "./navItems";
import { cn } from "@/components/ui/cn";

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  const items = navItemsFor((role as Role) ?? "patient");
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex h-[74px] w-full items-center justify-around border-t border-border bg-warm-white px-2 md:hidden">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.label}
            href={it.href}
            className={cn("flex flex-col items-center gap-1 px-3 py-1", active ? "text-primary" : "text-ink-muted")}
          >
            <Icon name={it.icon} fill={active} />
            <span className={cn("text-xs", active ? "font-extrabold" : "font-semibold")}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
