"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { NOTIFICATION_ICON, notificationReceived, onNotificationsChanged } from "@/lib/notifications";
import { Icon } from "@/components/ui/Icon";

const POLL_MS = 20000;
const TOAST_MS = 9000;

const UnreadContext = createContext(0);

/** Unread notification count for the signed-in person, kept fresh by the provider. */
export function useUnreadCount() {
  return useContext(UnreadContext);
}

/**
 * Polls the unread count for every role and pops a toast when a genuinely new
 * notification arrives. Pages read the count through `useUnreadCount` to badge
 * their bell.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<Notification | null>(null);
  // Newest unread notification already seen, so only genuinely new ones pop up.
  // undefined until the first check, which never toasts what was already waiting.
  const lastSeen = useRef<number | null | undefined>(undefined);
  // Only the newest request may update the badge; an older reply that lands
  // late (e.g. sent before "mark all read") would otherwise restore a stale count.
  const requestSeq = useRef(0);
  const enabled = Boolean(role);

  const check = useCallback(() => {
    if (!enabled || document.visibilityState === "hidden") return;
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
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, check]);

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
    <UnreadContext.Provider value={unread}>
      {children}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-24 right-4 z-50 w-[min(380px,calc(100vw-32px))] rounded-[20px] border border-border bg-warm-white p-4 shadow-modal md:bottom-6 md:right-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name={NOTIFICATION_ICON[toast.kind] ?? "notifications_active"} />
            </span>
            <button type="button" onClick={openToast} className="min-w-0 flex-1 text-left">
              <span className="block font-extrabold text-ink">{toast.title}</span>
              {toast.body && <span className="mt-0.5 line-clamp-2 block text-[14px] leading-5 text-ink-muted">{toast.body}</span>}
              <span className="mt-1 block text-[13px] font-extrabold text-primary">Open</span>
            </button>
            <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sand">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>
      )}
    </UnreadContext.Provider>
  );
}
