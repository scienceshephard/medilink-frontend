"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { navItemsFor, type Role } from "./navItems";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { NOTIFICATION_ICON, notificationReceived, onNotificationsChanged } from "@/lib/notifications";

const POLL_MS = 20000;
const TOAST_MS = 9000;

export function AppHeader() {
  const { role, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<Notification | null>(null);
  // Newest unread notification already seen, so only genuinely new ones pop up.
  // undefined until the first check, which never toasts what was already waiting.
  const lastSeen = useRef<number | null | undefined>(undefined);
  // Only the newest request may update the badge; an older reply that lands
  // late (e.g. sent before "mark all read") would otherwise restore a stale count.
  const requestSeq = useRef(0);
  const items = navItemsFor((role as Role) ?? "patient");
  const hasInbox = role === "patient" || role === "doctor";
  const hasBell = hasInbox || role === "clinic" || role === "admin";

  const check = useCallback(() => {
    if (!hasBell || document.visibilityState === "hidden") return;
    const seq = ++requestSeq.current;
    api.notifications.unreadCount()
      .then(({ unread: count, latest }) => {
        if (seq !== requestSeq.current) return;
        setUnread(count);
        const id = latest?.id ?? null;
        if (lastSeen.current !== undefined && latest && id !== lastSeen.current) {
          notificationReceived();
          if (pathname !== "/notifications") setToast(latest);
        }
        lastSeen.current = id;
      })
      .catch(() => undefined);
  }, [hasBell, pathname]);

  useEffect(() => {
    if (!hasBell) return;
    check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const unsubscribe = onNotificationsChanged(check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      unsubscribe();
    };
  }, [hasBell, check]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function openToast() {
    if (!toast) return;
    const target = toast.href ?? "/notifications";
    void api.notifications.read(toast.id).then(check).catch(() => undefined);
    setToast(null);
    router.push(target);
  }

  return (
    <>
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
          {hasBell && (
            <>
              {hasInbox && <Link href="/messages" aria-label="Messages" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e4d9c7] text-[#2b2621] hover:bg-white">
                <Icon name="chat" className="text-[19px]" />
              </Link>}
              <Link href="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e4d9c7] text-[#2b2621] hover:bg-white">
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
          {hasBell && (
            <>
              {hasInbox && <Link href="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-[#2b2621] hover:bg-white"><Icon name="chat" /> Messages</Link>}
              <Link href="/notifications" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-[#2b2621] hover:bg-white"><Icon name="notifications_active" /> Notifications{unread > 0 && <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d96b4a] px-1 text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>}</Link>
            </>
          )}
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-[15px] font-semibold text-[#6b6259]"><Icon name="logout" /> Sign out</button>
        </div>
      </nav>}
    </header>
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-40px))] rounded-[20px] border border-[#e4d9c7] bg-white p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name={NOTIFICATION_ICON[toast.kind] ?? "notifications_active"} />
            </span>
            <button type="button" onClick={openToast} className="min-w-0 flex-1 text-left">
              <span className="block font-extrabold text-ink">{toast.title}</span>
              {toast.body && <span className="mt-0.5 line-clamp-2 block text-body-sm text-ink-muted">{toast.body}</span>}
              <span className="mt-1 block text-caption font-bold text-primary">Open</span>
            </button>
            <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sand">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
