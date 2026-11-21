import { RoleGate } from "@/components/app/RoleGate";
import { SideRail } from "@/components/app/SideRail";
import { BottomNav } from "@/components/app/BottomNav";
import { NotificationsProvider } from "@/components/app/NotificationsProvider";

/**
 * Server component wrapping the signed-in app in the medlink-v4 shell: a
 * 248px side rail on desktop and a bottom tab bar on phones. Each page draws
 * its own header with `PageHeader`.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <NotificationsProvider>
        <div className="flex min-h-screen bg-sand text-ink">
          <SideRail />
          <main className="min-w-0 flex-1 px-5 pb-[106px] pt-4 md:px-12 md:pb-10 md:pt-10">
            <div className="mx-auto w-full max-w-[1100px]">{children}</div>
          </main>
          <BottomNav />
        </div>
      </NotificationsProvider>
    </RoleGate>
  );
}
