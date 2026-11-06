"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { navItemsFor, type Role } from "./navItems";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api";

export function AppHeader() {
  const { role, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const items = navItemsFor((role as Role) ?? "patient");
  const hasInbox = role === "patient" || role === "doctor";

  useEffect(() => {
    if (!hasInbox) return;
    let cancelled = false;
    const tick = () =>
      api.notifications.unreadCount()
        .then((r) => { if (!cancelled) setUnread(r.unread); })
        .catch(() => undefined);
    tick();
    const t = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [hasInbox, pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#e4d9c7] bg-[#f6efe4]/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-[5.4%]">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="MediLink home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2E6B4F] text-white"><Icon name="add" className="text-[25px]" /></span>
          <span className="font-serif text-[23px] font-bold tracking-[-0.04em] text-[#2b2621]">MediLink</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-0.5 xl:flex">
          {items.map((item) => {
            const itemPath = item.href.split("#")[0];
            const active = (pathname === itemPath && !item.href.includes("#")) || (itemPath !== "/dashboard" && pathname.startsWith(`${itemPath}/`));
            return <Link key={item.href} href={item.href} className={cn("rounded-full px-4 py-2 text-[14px] font-semibold transition-colors", active ? "bg-[#dcebe1] text-[#2E6B4F]" : "text-[#6b6259] hover:bg-[#f6efe4] hover:text-[#2b2621]")}>{item.label}</Link>;
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {hasInbox && (
            <>
              <Link href="/messages" aria-label="Messages" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e4d9c7] text-[#2b2621] hover:bg-white">
                <Icon name="chat" className="text-[19px]" />
              </Link>
              <Link href="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e4d9c7] text-[#2b2621] hover:bg-white">
                <Icon name="notifications_active" className="text-[19px]" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d96b4a] px-1 text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>
                )}
              </Link>
            </>
          )}
          <span className="hidden rounded-full bg-[#dcebe1] px-3 py-1.5 text-[12px] font-bold capitalize text-[#2E6B4F] sm:inline-flex">{role ?? "Care"}</span>
          <button type="button" onClick={logout} className="hidden items-center gap-2 rounded-full border border-[#e4d9c7] px-4 py-2 text-[13px] font-bold text-[#2b2621] hover:bg-white sm:inline-flex"><Icon name="logout" className="text-[18px]" /> Sign out</button>
          <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e4d9c7] text-[#2b2621] xl:hidden"><Icon name={menuOpen ? "close" : "menu"} /></button>
        </div>
      </div>
      {menuOpen && <nav aria-label="Mobile navigation" className="border-t border-[#e4d9c7] bg-[#f6efe4] px-5 py-3 xl:hidden">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 sm:px-3">
          {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={cn("rounded-xl px-4 py-3 text-[15px] font-semibold", pathname === item.href.split("#")[0] ? "bg-[#dcebe1] text-[#2E6B4F]" : "text-[#2b2621] hover:bg-white")}>{item.label}</Link>)}
          {hasInbox && (
            <>
              <Link href="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-[#2b2621] hover:bg-white"><Icon name="chat" /> Messages</Link>
              <Link href="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-[#2b2621] hover:bg-white"><Icon name="notifications_active" /> Notifications{unread > 0 && <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d96b4a] px-1 text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>}</Link>
            </>
          )}
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-[15px] font-semibold text-[#6b6259]"><Icon name="logout" /> Sign out</button>
        </div>
      </nav>}
    </header>
  );
}
