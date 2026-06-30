"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useAuth, homeForRole } from "@/lib/auth";

const steps = [
  {
    step: "Step 1",
    icon: "chat_bubble",
    iconBg: "bg-secondary-container",
    iconColor: "text-on-secondary-container",
    labelColor: "text-primary",
    title: "Describe Symptoms",
    description:
      "Have a secure, natural conversation with our AI about how you're feeling. No medical jargon required.",
  },
  {
    step: "Step 2",
    icon: "analytics",
    iconBg: "bg-tertiary-container",
    iconColor: "text-on-tertiary-container",
    labelColor: "text-tertiary",
    title: "AI Analysis",
    description:
      "Our clinical-grade engine securely analyzes your inputs against thousands of medical specialties and conditions.",
  },
  {
    step: "Step 3",
    icon: "how_to_reg",
    iconBg: "bg-primary-container",
    iconColor: "text-on-primary-container",
    labelColor: "text-primary",
    title: "Get Matched",
    description:
      "Review top-rated specialists in your area who accept your insurance and book an appointment instantly.",
  },
];

export default function Landing() {
  const { role, ready } = useAuth();
  const cta = ready && role ? homeForRole(role) : "/register";

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      {/* Header / TopAppBar */}
      <header className="sticky top-0 z-40 w-full bg-surface shadow-sm">
        <div className="mx-auto max-w-container-max px-gutter flex h-16 items-center justify-between">
          {/* Brand */}
          <Brand />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-sm">
            <Link
              href="/doctors"
              className="rounded-full px-4 py-2 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Find Doctor
            </Link>
            <Link
              href="/appointments"
              className="rounded-full px-4 py-2 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Bookings
            </Link>
            <Link
              href="/profile"
              className="rounded-full px-4 py-2 text-label-md font-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Profile
            </Link>
          </nav>

          {/* Auth actions + help icon */}
          <div className="flex items-center gap-sm">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href={cta}>
              <Button>Get started</Button>
            </Link>
            <button
              aria-label="Help"
              className="rounded-full p-2 text-primary hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
            >
              <Icon name="help_outline" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full mx-auto max-w-container-max px-gutter pt-lg md:pt-xl pb-xl">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-xl mb-xl">
          {/* Hero copy */}
          <div className="w-full md:w-1/2 flex flex-col gap-md items-start">
            {/* AI-Powered badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-4 py-2 text-label-md font-label-md text-on-primary-fixed-variant">
              <Icon name="psychiatry" fill />
              <span>AI-Powered Matching</span>
            </div>

            <h1 className="text-display-lg font-display-lg text-on-surface leading-tight">
              Find the right doctor in minutes using AI.
            </h1>

            <p className="text-body-lg font-body-lg text-on-surface-variant max-w-lg">
              Skip the endless searching. Tell our secure AI about your symptoms,
              and get matched with highly-rated specialists who are taking new
              patients near you.
            </p>

            <div className="mt-4 w-full sm:w-auto">
              <Link href={cta} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <span>Start Assessment</span>
                  <Icon name="arrow_forward" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero visual — gradient block instead of external image */}
          <div className="w-full md:w-1/2 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-fixed to-secondary-fixed rounded-[3rem] rotate-3 scale-105 opacity-50 z-0" />
            <div className="relative z-10 w-full aspect-square md:aspect-[4/3] rounded-[3rem] bg-gradient-to-br from-primary-fixed to-secondary-fixed shadow-xl" />
          </div>
        </section>

        {/* How TeleMed Works — 3-step bento grid */}
        <section className="mt-xl pt-xl">
          <div className="text-center mb-lg">
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-sm">
              How TeleMed Works
            </h2>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl mx-auto">
              Three simple steps to finding the perfect specialist for your
              needs, powered by advanced medical AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {steps.map((s) => (
              <Card
                key={s.step}
                hover
                className="flex flex-col h-full"
              >
                {/* Icon circle */}
                <div
                  className={`w-12 h-12 rounded-full ${s.iconBg} ${s.iconColor} flex items-center justify-center mb-md`}
                >
                  <Icon name={s.icon} fill />
                </div>

                <div className={`text-label-md font-label-md ${s.labelColor} mb-xs`}>
                  {s.step}
                </div>
                <h3 className="text-headline-md font-headline-md text-on-surface mb-sm">
                  {s.title}
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant flex-grow">
                  {s.description}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
