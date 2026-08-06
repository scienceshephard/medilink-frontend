import { RoleGate } from "@/components/app/RoleGate";
import { SideRail } from "@/components/app/SideRail";
import { BottomNav } from "@/components/app/BottomNav";

/**
 * Server component. It renders client components (RoleGate, SideRail,
 * BottomNav) but is not one itself, which is what lets the Material Symbols
 * stylesheet below be hoisted into <head> for authenticated routes only.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        The icon font is loaded HERE rather than in the root layout, so the
        public surface (/, /login, /register) never pays for it. Those routes
        use inline SVG (`SvgIcon`) for the eight glyphs they need.

        `display=block` — not `swap` — because this is a ligature font: with
        `swap` the browser paints the fallback immediately, which for an icon
        font means rendering the ligature's literal text ("calendar_month").
        `block` shows nothing briefly, then the glyph.

        Axes are pinned to what the app actually uses. The previous request
        asked for every axis (opsz 20..48, wght 100..700, GRAD -50..200), which
        makes the served font substantially larger for no benefit.
      */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@0..1&display=block"
        rel="stylesheet"
      />
      <RoleGate>
        <div className="flex min-h-screen bg-sand">
          <SideRail />
          <main className="min-w-0 flex-1 px-5 pb-28 pt-6 md:px-10 md:py-8">{children}</main>
          <BottomNav />
        </div>
      </RoleGate>
    </>
  );
}
