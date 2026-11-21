import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/Icon";

/**
 * Sign-in, sign-up and password screens from medlink-v4: a terracotta panel
 * beside the form on desktop, and the bare form on the sand background on
 * phones — either under the logo, or under a back button when `back` is set.
 */
export function AuthShell({
  panelTitle,
  panelText,
  title,
  back,
  children,
}: {
  panelTitle: string;
  panelText: string;
  title: string;
  back?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-sand lg:grid lg:grid-cols-[520px_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-center gap-5 bg-primary px-14 text-white lg:flex">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-primary"><Icon name="favorite" fill className="text-[20px]" /></span>
          <span className="text-[22px] font-extrabold">MediLink</span>
        </Link>
        <span className="mt-4 grid h-[72px] w-[72px] place-items-center rounded-full bg-white/15"><Icon name="health_and_safety" className="text-[36px]" /></span>
        <h2 className="text-[44px] font-extrabold leading-[1.1]">{panelTitle}</h2>
        <p className="max-w-[360px] text-[17px] leading-7 text-white/85">{panelText}</p>
      </aside>

      <div className="flex min-h-screen justify-center px-5 py-6 lg:items-center lg:py-12">
        <div className="flex w-full max-w-[420px] flex-col gap-5">
          {back ? (
            <header className="flex items-center gap-3">
              <Link href={back} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-warm-white text-ink hover:bg-primary-soft">
                <Icon name="arrow_back" className="text-[22px]" />
              </Link>
              <h1 className="text-[22px] font-extrabold text-ink lg:text-[28px]">{title}</h1>
            </header>
          ) : (
            <header className="flex flex-col gap-4 pt-[12vh] lg:pt-0">
              <Brand className="lg:hidden" />
              <h1 className="text-[30px] font-extrabold leading-tight text-ink lg:text-[28px]">{title}</h1>
            </header>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
