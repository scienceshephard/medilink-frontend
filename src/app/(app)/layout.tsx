import { RoleGate } from "@/components/app/RoleGate";
import { AppHeader } from "@/components/app/AppHeader";

/**
 * Server component. It renders client components (RoleGate, SideRail,
 * BottomNav) but is not one itself, which is what lets the Material Symbols
 * stylesheet below be hoisted into <head> for authenticated routes only.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RoleGate>
        <div className="min-h-screen bg-[#fcfbf8] text-[#25352e]">
          <AppHeader />
          <main className="mx-auto min-h-[calc(100vh-72px)] w-full max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-[5.4%] lg:py-10">{children}</main>
        </div>
      </RoleGate>
    </>
  );
}
