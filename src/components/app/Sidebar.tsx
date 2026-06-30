"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";
import { clsx } from "@/lib/clsx";

interface SidebarItem {
  label: string;
  href: string;
}

export function Sidebar({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center px-6 py-5">
        <Link href="/">
          <Brand />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex h-11 items-center rounded-lg px-4 text-label-md font-medium transition-colors",
                active
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant px-4 py-4">
        <button
          onClick={logout}
          className="flex h-11 w-full items-center rounded-lg px-4 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
