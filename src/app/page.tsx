"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/Icon";
import { useAuth, homeForRole } from "@/lib/auth";

export default function Welcome() {
  const { role, ready } = useAuth();
  const cta = ready && role ? homeForRole(role) : "/register";

  return (
    <div className="flex min-h-screen flex-col bg-sand px-6 py-8">
      <Brand />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="grid h-40 w-40 place-items-center rounded-[48px] bg-accent-soft md:h-48 md:w-48">
          <Icon name="health_and_safety" className="text-[88px] text-accent md:text-[104px]" />
        </div>
        <h1 className="max-w-md text-display-lg font-extrabold leading-tight text-ink">Feel better, faster.</h1>
        <p className="max-w-sm text-body-lg text-ink-muted">
          Tell us how you feel and we&apos;ll find the right doctor for you. Simple, and free.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <Link
          href={cta}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-body-lg font-extrabold text-on-primary transition-colors hover:bg-primary-container"
        >
          Get started <Icon name="arrow_forward" />
        </Link>
        <Link href="/login" className="text-center font-bold text-ink-muted">
          Already have an account? <span className="font-extrabold text-primary">Log in</span>
        </Link>
      </div>
    </div>
  );
}
