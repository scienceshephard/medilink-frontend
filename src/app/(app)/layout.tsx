"use client";
import { useAuth } from "@/lib/auth";
import { RoleGate } from "@/components/app/RoleGate";
import { TopNav } from "@/components/app/TopNav";
import { Sidebar } from "@/components/app/Sidebar";

const doctorItems = [{ label: "Schedule", href: "/doctor-portal" }];
const adminItems = [{ label: "Overview", href: "/admin" }];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  return (
    <RoleGate>
      {role === "patient" ? (
        <div className="min-h-screen">
          <TopNav />
          <main className="mx-auto max-w-container-max px-gutter pt-md pb-28 md:pb-lg md:pt-24">{children}</main>
        </div>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar items={role === "admin" ? adminItems : doctorItems} />
          <main className="flex-1 px-gutter py-8">{children}</main>
        </div>
      )}
    </RoleGate>
  );
}
