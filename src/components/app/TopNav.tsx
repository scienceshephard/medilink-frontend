"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Symptom Checker", href: "/intake" },
  { label: "My Appointments", href: "/appointments" },
];

const mobileItems = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Symptoms", href: "/intake", icon: "search" },
  { label: "Bookings", href: "/appointments", icon: "event_available" },
  { label: "Profile", href: "/profile", icon: "person" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function TopNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <>
      {/* Desktop top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden h-16 items-center border-b border-outline-variant bg-surface px-gutter shadow-sm md:flex">
        <div className="mx-auto flex h-full w-full max-w-container-max items-center justify-between">
          <Link href="/dashboard" className="text-headline-lg font-bold tracking-tight text-primary">
            TeleMed
          </Link>
          <div className="flex items-center gap-md">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex h-16 items-center px-sm transition-colors hover:text-primary",
                    active ? "border-b-2 border-primary font-bold text-primary" : "text-on-surface-variant",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-sm text-primary">
            <button className="rounded-full p-2 transition-colors hover:bg-surface-variant active:opacity-80" aria-label="Notifications">
              <Icon name="notifications" />
            </button>
            <Link href="/profile" className="rounded-full p-2 transition-colors hover:bg-surface-variant active:opacity-80" aria-label="Profile">
              <Icon name="account_circle" />
            </Link>
            <button onClick={logout} className="rounded-full p-2 transition-colors hover:bg-surface-variant active:opacity-80" aria-label="Log out">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 z-50 flex h-20 w-full items-center justify-around border-t border-outline-variant bg-surface/90 px-xs shadow-lg backdrop-blur-xl md:hidden">
        {mobileItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full px-4 py-1 transition-transform duration-200",
                active ? "scale-110 bg-primary-container text-on-primary-container" : "text-on-surface-variant opacity-80 hover:opacity-100",
              )}
            >
              <Icon name={item.icon} fill={active} />
              <span className="mt-1 text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
