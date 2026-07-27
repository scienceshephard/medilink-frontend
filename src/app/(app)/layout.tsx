"use client";
import { RoleGate } from "@/components/app/RoleGate";
import { SideRail } from "@/components/app/SideRail";
import { BottomNav } from "@/components/app/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <div className="flex min-h-screen bg-sand">
        <SideRail />
        <main className="min-w-0 flex-1 px-5 pb-28 pt-6 md:px-10 md:py-8">{children}</main>
        <BottomNav />
      </div>
    </RoleGate>
  );
}
