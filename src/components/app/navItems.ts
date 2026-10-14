export type Role = "patient" | "doctor" | "admin";
export interface NavItem { label: string; href: string; icon: string; }

const PATIENT: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Find care", href: "/find-care", icon: "search" },
  { label: "Visits", href: "/appointments", icon: "calendar_month" },
  { label: "Me", href: "/profile", icon: "sentiment_satisfied" },
];
// Requests and availability are sections of the portal page, not separate
// routes — so they link to fragments. Without the fragments all three items
// resolve to the same href and highlight simultaneously.
const DOCTOR: NavItem[] = [
  { label: "Today", href: "/doctor-portal", icon: "today" },
  { label: "Requests", href: "/doctor-portal#requests", icon: "inbox" },
  { label: "My times", href: "/doctor-portal#times", icon: "event_available" },
  { label: "Me", href: "/doctor-profile", icon: "person" },
];
const ADMIN: NavItem[] = [
  { label: "Overview", href: "/admin", icon: "dashboard" },
  { label: "Doctors", href: "/admin/doctors", icon: "stethoscope" },
  { label: "Model", href: "/admin/model", icon: "neurology" },
  { label: "Me", href: "/admin/account", icon: "person" },
];

export function navItemsFor(role: Role): NavItem[] {
  if (role === "doctor") return DOCTOR;
  if (role === "admin") return ADMIN;
  return PATIENT;
}

/**
 * Resolve the single nav item to highlight.
 *
 * Returns at most one href, so items sharing a path (`/doctor-portal`,
 * `/doctor-portal#requests`, `/doctor-portal#times`) can never all light up.
 * An exact fragment match wins; otherwise the fragment-less item for that path.
 */
export function activeHref(items: NavItem[], pathname: string, hash: string): string | null {
  const onPath = items.filter((it) => {
    const path = it.href.split("#")[0];
    return pathname === path || pathname.startsWith(path + "/");
  });
  if (onPath.length === 0) return null;

  const fragment = hash.replace(/^#/, "");
  if (fragment) {
    const exact = onPath.find((it) => it.href.split("#")[1] === fragment);
    if (exact) return exact.href;
  }
  return (onPath.find((it) => !it.href.includes("#")) ?? onPath[0]).href;
}
