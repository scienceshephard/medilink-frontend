import { useEffect, useRef } from "react";
import { parseServerDate } from "./format";

/** Which icon each notification kind uses, shared by the bell's toast and the notifications page. */
export const NOTIFICATION_ICON: Record<string, string> = {
  request: "inbox",
  visit: "event_available",
  payment: "payments",
  rating: "star",
  reminder: "schedule",
  message: "chat",
  care_plan: "description",
  clinic: "local_hospital",
  verification: "verified",
  activity: "monitoring",
};

const CHANGED = "medilink:notifications-changed";
const RECEIVED = "medilink:notification-received";

/** Announce that a new notification arrived, so open pages can refresh their data. */
export function notificationReceived(): void {
  window.dispatchEvent(new Event(RECEIVED));
}

/** Run `refresh` whenever a new notification arrives (a booking, an acceptance…). */
export function useRefreshOnNotification(refresh: () => void): void {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    const listener = () => latest.current();
    window.addEventListener(RECEIVED, listener);
    return () => window.removeEventListener(RECEIVED, listener);
  }, []);
}

/** Tell the header to refresh its unread count now (e.g. after marking items read). */
export function notificationsChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}

export function onNotificationsChanged(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
}

/** "just now", "5 min ago", "3 h ago", then a date. */
export function timeAgo(iso: string): string {
  const then = parseServerDate(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(then).toLocaleDateString([], { day: "numeric", month: "short" });
}
