"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { navItemsFor, type Role } from "./navItems";
import { cn } from "@/components/ui/cn";

export function AppHeader() {
  const { role, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItemsFor((role as Role) ?? "patient");

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6e8e2] bg-[#fcfbf8]/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-[5.4%]">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="MediLink home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#286653] text-white"><Icon name="add" className="text-[25px]" /></span>
          <span className="font-serif text-[23px] font-bold tracking-[-0.04em] text-[#213c32]">MediLink</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-0.5 xl:flex">
          {items.map((item) => {
            const itemPath = item.href.split("#")[0];
            const active = (pathname === itemPath && !item.href.includes("#")) || (itemPath !== "/dashboard" && pathname.startsWith(`${itemPath}/`));
            return <Link key={item.href} href={item.href} className={cn("rounded-full px-4 py-2 text-[14px] font-semibold transition-colors", active ? "bg-[#e9f0e9] text-[#286653]" : "text-[#59645e] hover:bg-[#f0f1ed] hover:text-[#243c32]")}>{item.label}</Link>;
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-[#edf3ed] px-3 py-1.5 text-[12px] font-bold capitalize text-[#286653] sm:inline-flex">{role ?? "Care"}</span>
          <button type="button" onClick={logout} className="hidden items-center gap-2 rounded-full border border-[#d9ded8] px-4 py-2 text-[13px] font-bold text-[#34473e] hover:bg-white sm:inline-flex"><Icon name="logout" className="text-[18px]" /> Sign out</button>
          <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-full border border-[#d9ded8] text-[#34473e] xl:hidden"><Icon name={menuOpen ? "close" : "menu"} /></button>
        </div>
      </div>
      {menuOpen && <nav aria-label="Mobile navigation" className="border-t border-[#e6e8e2] bg-[#fcfbf8] px-5 py-3 xl:hidden">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 sm:px-3">
          {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={cn("rounded-xl px-4 py-3 text-[15px] font-semibold", pathname === item.href.split("#")[0] ? "bg-[#e9f0e9] text-[#286653]" : "text-[#34473e] hover:bg-white")}>{item.label}</Link>)}
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-[15px] font-semibold text-[#59645e]"><Icon name="logout" /> Sign out</button>
        </div>
      </nav>}
    </header>
  );
}
