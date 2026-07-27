"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/ui/Icon";
import { useAuth, homeForRole } from "@/lib/auth";

const STEPS: [string, string, string][] = [
  ["touch_app", "Tell us how you feel", "Tap what hurts and how bad it is. No hard words."],
  ["neurology", "We find a match", "We pick a good doctor for your problem — and tell you why."],
  ["favorite", "Feel better", "See the doctor, then tell us if you got better."],
];

export default function Landing() {
  const { role, ready } = useAuth();
  const cta = ready && role ? homeForRole(role) : "/register";

  return (
    <div className="min-h-screen bg-sand">
      <header className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 md:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <Link href="/login" className="inline-flex h-11 items-center rounded-full px-5 font-extrabold text-primary hover:bg-primary-soft">Log in</Link>
          <Link href={cta} className="inline-flex h-11 items-center rounded-full bg-primary px-5 font-extrabold text-on-primary">Get started</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 md:px-8">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-10 text-center md:flex-row md:gap-10 md:py-16 md:text-left">
          <div className="flex flex-1 flex-col items-center gap-5 md:items-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 font-bold text-primary">
              <Icon name="neurology" fill /> Matched by smart care
            </span>
            <h1 className="text-display-lg font-extrabold leading-tight text-ink">Feel better, faster.</h1>
            <p className="max-w-md text-body-lg text-ink-muted">
              Tell us how you feel and we&apos;ll find the right doctor for you. Simple, and free while we&apos;re testing.
            </p>
            <Link href={cta} className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-body-lg font-extrabold text-on-primary transition-colors hover:bg-primary-container">
              Start now <Icon name="arrow_forward" />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="grid h-64 w-64 place-items-center rounded-[48px] bg-accent-soft md:h-80 md:w-80">
              <Icon name="health_and_safety" className="text-[120px] text-accent" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-6 py-10">
          <h2 className="text-center text-headline-lg font-extrabold text-ink">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map(([icon, title, desc], i) => (
              <div key={title} className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-6">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} /></span>
                <p className="text-caption font-extrabold text-primary">Step {i + 1}</p>
                <h3 className="text-headline-md font-extrabold text-ink">{title}</h3>
                <p className="text-body-md text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
