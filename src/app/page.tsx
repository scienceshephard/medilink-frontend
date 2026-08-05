"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAuth, homeForRole } from "@/lib/auth";

export default function Welcome() {
  const router = useRouter();
  const { role, ready } = useAuth();

  // Signed-in visitors don't need the welcome. We redirect AFTER render rather
  // than returning null before it: `ready` is false during prerender, so an
  // early return would strip the entire page out of the static HTML.
  useEffect(() => {
    if (ready && role) router.replace(homeForRole(role));
  }, [ready, role, router]);

  return (
    <div className="flex min-h-screen flex-col bg-sand md:flex-row">
      {/* Hero — plain on mobile, terracotta panel on desktop */}
      <div className="flex flex-1 flex-col gap-6 px-6 py-10 md:w-[46%] md:max-w-[560px] md:flex-none md:justify-center md:bg-primary md:px-16">
        {/* Brand: ink on sand (mobile), white on terracotta (desktop) */}
        <span className="inline-flex items-center gap-2 font-extrabold text-ink md:text-on-primary">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-on-primary md:bg-white md:text-primary">
            <Icon name="favorite" fill />
          </span>
          <span className="text-headline-md tracking-tight">MediLink</span>
        </span>

        <div className="flex flex-1 flex-col items-center gap-6 text-center md:flex-none md:items-start md:text-left">
          <div className="grid h-40 w-40 place-items-center rounded-[40px] bg-primary-soft md:h-24 md:w-24 md:bg-white/15">
            <Icon name="health_and_safety" className="text-[88px] text-primary md:text-[54px] md:text-on-primary" />
          </div>
          <h1 className="max-w-md text-display-lg font-extrabold leading-tight text-ink md:text-on-primary">Feel better, faster.</h1>
          <p className="max-w-sm text-body-lg text-ink-muted md:text-on-primary/90">
            Tell us how you feel and we&apos;ll find the right doctor for you. Simple, and free.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col justify-center gap-6 px-6 pb-10 md:flex-1 md:items-center md:py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-5 hidden md:block">
            <h2 className="text-headline-lg font-extrabold text-ink">Welcome 👋</h2>
            <p className="text-body-md text-ink-muted">Let&apos;s find you a good doctor.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/register"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-body-lg font-extrabold text-on-primary transition-colors hover:bg-primary-container"
            >
              Get started <Icon name="arrow_forward" />
            </Link>
            <Link href="/login" className="text-center font-bold text-ink-muted">
              Already have an account? <span className="font-extrabold text-primary">Log in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
