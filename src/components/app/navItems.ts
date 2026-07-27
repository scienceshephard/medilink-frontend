export type Role = "patient" | "doctor" | "admin";
export interface NavItem { label: string; href: string; icon: string; }

const PATIENT: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Find care", href: "/intake", icon: "search" },
  { label: "Visits", href: "/appointments", icon: "calendar_month" },
  { label: "Me", href: "/profile", icon: "sentiment_satisfied" },
];
const DOCTOR: NavItem[] = [
  { label: "Today", href: "/doctor-portal", icon: "today" },
  { label: "Requests", href: "/doctor-portal", icon: "inbox" },
  { label: "My times", href: "/doctor-portal", icon: "event_available" },
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
