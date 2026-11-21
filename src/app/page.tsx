"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homeForRole } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

// Editorial landing page — design/medlink-v4.pen, "Desktop/75" and "Phone/75 Landing — Editorial".
// Photos are Unsplash stock; phone images are exports of the real app screens in the same file.
const IMG = "/images/landing";

const NAV = [
  ["How it works", "#how"],
  ["For doctors", "#doctors"],
  ["For clinics", "#doctors"],
  ["Questions", "#questions"],
] as const;

const COMES_IN_FOR = [
  ["thermostat", "Fever"],
  ["neurology", "Headaches"],
  ["monitor_heart", "Chest pain"],
  ["local_dining", "Stomach trouble"],
  ["healing", "Skin rashes"],
  ["accessibility_new", "Back pain"],
] as const;

const STEPS = [
  {
    eyebrow: "Describe it",
    title: "Say it how it feels.",
    body: "Tap what hurts, say how bad it is, and add a line in your own words. You don't need medical terms, or to know what's wrong.",
    chips: ["Headache", "Fever", "Chest pain", "Cough", "+7 more"],
    tint: "bg-[#F3DDD2]",
    screen: "screen-find-care.webp",
    alt: "The Find care screen with symptom tiles and a severity choice",
    // Show the middle of the screen: the illness chips and "How bad is it?".
    offset: "-top-[260px]",
  },
  {
    eyebrow: "Choose who",
    title: "See who fits, and why.",
    body: "Doctors are ranked for what you told us. Each one shows why they were picked, when they're free next and what a visit costs.",
    chips: ["Licence checked", "Next free time", "Price up front"],
    tint: "bg-[#DCE6DC]",
    screen: "screen-why-doctor.webp",
    alt: "The Why this doctor screen explaining a match",
    offset: "top-[56px]",
  },
  {
    eyebrow: "Meet how you like",
    title: "Video, clinic, or at your door.",
    body: "Pick a time. The doctor confirms first, and only then do you pay. For home visits you can follow them on the way.",
    chips: ["Video call", "Clinic visit", "Home visit"],
    tint: "bg-[#E9DDC8]",
    screen: "screen-home-visit.webp",
    alt: "The Home visit screen showing the doctor on the way",
    offset: "top-[56px]",
  },
];

const PROMISES = [
  ["We don't diagnose.", "MediLink helps you reach a real, licensed doctor. In an emergency, go straight to the nearest hospital."],
  ["Every doctor is checked.", "An admin checks each doctor's licence with the issuing council before they can see anyone."],
  ["You pay after a yes.", "Nothing is charged until a doctor accepts. If a visit is cancelled, your money comes back."],
];

const FAQ = [
  ["How much does a visit cost?", "Each doctor sets their own price, and you see it before you book. You pay only after the doctor accepts."],
  ["What if the doctor says no?", "The time is freed straight away and we suggest the next best doctor for what you described."],
  ["Can a doctor come to my home?", "Yes, if a doctor near you offers home visits. You share your address only with the doctor you ask."],
  ["Who can see what I write?", "Only the doctors involved in your care. You choose what to share."],
];

const display = "font-display font-extrabold text-ink";
const eyebrow = "font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-primary md:text-[13px]";

export default function Landing() {
  const router = useRouter();
  const { role, ready } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { if (ready && role) router.replace(homeForRole(role)); }, [ready, role, router]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-paper text-ink">
      {/* Nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-12 md:py-[22px]">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-white"><Icon name="favorite" fill className="text-[18px]" /></span>
            <span className="font-display text-[21px] font-extrabold tracking-[-0.02em]">MediLink</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-[34px] text-[15px] font-semibold text-ink-muted lg:flex">
            {NAV.map(([label, href]) => <a key={label} href={href} className="transition-colors hover:text-ink">{label}</a>)}
          </nav>
          <div className="flex items-center gap-3 md:gap-5">
            <Link href="/login" className="text-[15px] font-bold">Log in</Link>
            <Link href="/register" className="hidden rounded-full bg-ink px-5 py-[11px] text-[15px] font-extrabold text-white transition hover:bg-black sm:inline-flex">Find a doctor</Link>
            <button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full border border-[#E3DCD0] lg:hidden">
              <Icon name={menuOpen ? "close" : "menu"} className="text-[20px]" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile" className="mx-5 flex flex-col rounded-[20px] border border-[#E3DCD0] bg-[#FBF9F5] p-2 lg:hidden">
            {NAV.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 font-bold">{label}</a>)}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 pb-8 pt-9 md:items-center md:gap-[26px] md:px-12 md:pb-14 md:pt-[84px] md:text-center">
        <span className="w-fit rounded bg-primary-soft px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.07em] text-primary-container md:px-2.5 md:text-[12px]">CARE, WITHOUT THE WAITING ROOM</span>
        <h1 className={cn(display, "text-[46px] leading-none tracking-[-0.035em] md:text-[88px] md:tracking-[-0.034em]")}>
          Tell us where it hurts.<br className="hidden md:block" /> We&apos;ll find your doctor.
        </h1>
        <p className="max-w-[600px] text-[17px] leading-[1.55] text-ink-muted md:text-[19px]">
          Pick what you feel, see doctors who treat it, and book a video call, a clinic visit or a home visit. You only pay after a doctor says yes.
        </p>
        <div className="flex flex-col gap-3.5 pt-1 md:items-center">
          <Link href="/register" className="inline-flex items-center justify-center gap-2.5 rounded-full bg-primary px-[30px] py-[17px] text-[18px] font-extrabold text-white transition hover:bg-primary-container">
            Find a doctor <Icon name="arrow_forward" className="text-[20px]" />
          </Link>
          <p className="text-center font-mono text-[12px] text-ink-muted md:text-[13px]">
            Free to sign up · Pay only after a yes<span className="hidden md:inline"> · Video, clinic or home</span>
          </p>
        </div>
      </section>

      <HeroStage />

      {/* What people come in for */}
      <section className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 pb-2 pt-9 md:flex-row md:items-center md:justify-center md:gap-10 md:px-12 md:pb-6 md:pt-14">
        <p className="font-mono text-[11px] tracking-[0.08em] text-ink-muted md:text-[12px]">PEOPLE COME IN FOR</p>
        <ul className="flex flex-wrap gap-x-[18px] gap-y-2 md:gap-10">
          {COMES_IN_FOR.map(([icon, label]) => (
            <li key={label} className="flex items-center gap-1.5 text-[15px] font-bold md:gap-2 md:text-[16px]"><Icon name={icon} className="text-[17px]" />{label}</li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <div id="how" className="scroll-mt-6">
        {STEPS.map((step, i) => (
          <section key={step.title} className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 pt-14 md:flex-row md:items-center md:gap-24 md:px-24 md:py-[110px]">
            <div className={cn("flex flex-col gap-4 md:w-[440px] md:shrink-0 md:gap-[22px]", i === 1 && "md:order-2")}>
              <p className={eyebrow}>{step.eyebrow}</p>
              <h2 className={cn(display, "text-[38px] leading-[1.02] tracking-[-0.03em] md:text-[64px] md:leading-none")}>{step.title}</h2>
              <p className="text-[16px] leading-[1.6] text-ink-muted md:text-[18px]">{step.body}</p>
              <ul className="hidden flex-wrap gap-2 md:flex">
                {step.chips.map((c) => <li key={c} className="rounded-full border border-[#E3DCD0] bg-[#FBF9F5] px-3 py-1.5 font-mono text-[12px]">{c}</li>)}
              </ul>
            </div>
            <div className={cn("relative h-[400px] w-full overflow-hidden rounded-[26px] md:h-[600px] md:rounded-[32px]", step.tint, i === 1 && "md:order-1")}>
              <PhoneShot src={step.screen} alt={step.alt} className={cn("absolute left-1/2 w-[338px] -translate-x-1/2 md:w-[390px]", step.offset)} />
            </div>
          </section>
        ))}
      </div>

      {/* Promises */}
      <section className="mt-14 bg-ink md:mt-0">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-16 md:gap-14 md:px-24 md:py-[120px]">
          <div className="flex flex-col gap-4">
            <p className={cn(eyebrow, "text-[#E8A58F]")}>What we promise</p>
            <h2 className="font-display text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] text-paper md:text-[64px]">Plain about what we are.</h2>
          </div>
          <div className="grid gap-7 md:grid-cols-3 md:gap-12">
            {PROMISES.map(([title, body]) => (
              <div key={title} className="flex flex-col gap-2 border-t border-[#3A332C] pt-[18px] md:gap-3 md:pt-6">
                <h3 className="font-display text-[23px] font-bold tracking-[-0.015em] text-paper md:text-[28px]">{title}</h3>
                <p className="text-[16px] leading-[1.55] text-[#BDB3A8] md:text-[17px]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors and clinics */}
      <section id="doctors" className="mx-auto grid max-w-[1440px] scroll-mt-6 gap-3.5 px-5 pb-6 pt-14 md:grid-cols-2 md:gap-6 md:px-24 md:pb-[60px] md:pt-[120px]">
        {[
          ["For doctors", "See patients on your own hours.", "Set your free times, accept the requests that fit, and get paid after each visit. Video, clinic or home — your choice.", "Join as a doctor", "/register?role=doctor"],
          ["For clinics", "Send each request to the right person.", "Take care requests for your area, assign them to your team, and keep track of who's covering where.", "Register your clinic", "/register/clinic"],
        ].map(([kicker, title, body, cta, href]) => (
          <div key={kicker} className="flex flex-col items-start gap-3.5 rounded-[22px] border border-[#E3DCD0] bg-[#FBF9F5] p-6 md:gap-[18px] md:rounded-[28px] md:p-11">
            <p className={eyebrow}>{kicker}</p>
            <h3 className={cn(display, "text-[28px] leading-[1.05] tracking-[-0.03em] md:text-[40px]")}>{title}</h3>
            <p className="hidden text-[17px] leading-[1.6] text-ink-muted md:block">{body}</p>
            <Link href={href} className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink px-5 py-3 text-[15px] font-extrabold transition hover:bg-ink hover:text-white md:px-[22px] md:py-[13px] md:text-[16px]">
              {cta} <Icon name="arrow_forward" className="text-[17px]" />
            </Link>
          </div>
        ))}
      </section>

      {/* Questions */}
      <section id="questions" className="mx-auto flex max-w-[1440px] scroll-mt-6 flex-col gap-5 px-5 py-10 md:flex-row md:gap-24 md:px-24 md:py-[90px]">
        <div className="flex flex-col gap-4 md:w-[380px] md:shrink-0">
          <p className={cn(eyebrow, "hidden md:block")}>Questions</p>
          <h2 className={cn(display, "text-[38px] leading-none tracking-[-0.03em] md:text-[56px]")}>Questions,<br />answered.</h2>
        </div>
        <div className="flex-1">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0} className="group border-t border-[#E3DCD0] py-5 md:py-[26px]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-[19px] font-bold tracking-[-0.015em] md:text-[24px]">{q}</span>
                <Icon name="add" className="shrink-0 text-[22px] transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-[640px] text-[15px] leading-[1.6] text-ink-muted md:text-[17px]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto flex max-w-[1440px] flex-col gap-[18px] px-5 pb-14 pt-12 md:items-center md:gap-[26px] md:px-12 md:pb-[120px] md:pt-[110px] md:text-center">
        <h2 className={cn(display, "text-[44px] leading-none tracking-[-0.034em] md:text-[80px]")}>Feeling unwell?<br className="hidden md:block" /> Start here.</h2>
        <p className="hidden text-[19px] text-ink-muted md:block">It takes about a minute to tell us what&apos;s wrong.</p>
        <Link href="/register" className="inline-flex items-center justify-center gap-2.5 rounded-full bg-primary px-[30px] py-[17px] text-[18px] font-extrabold text-white transition hover:bg-primary-container">
          Find a doctor <Icon name="arrow_forward" className="text-[20px]" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="overflow-hidden border-t border-[#E3DCD0]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pt-8 md:gap-10 md:px-12 md:pt-14">
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <p className="hidden max-w-[340px] text-[15px] leading-[1.6] text-ink-muted md:block">Find a licensed doctor for what you feel, and see them by video, at a clinic, or at home.</p>
            <div className="grid grid-cols-2 gap-6 md:flex md:gap-[72px]">
              {[
                ["Patients", [["Find a doctor", "/register"], ["How it works", "#how"], ["Questions", "#questions"]]],
                ["Doctors & clinics", [["Join as a doctor", "/register?role=doctor"], ["Register a clinic", "/register/clinic"], ["Log in", "/login"]]],
              ].map(([heading, links]) => (
                <div key={heading as string} className="flex flex-col gap-2.5 md:gap-3">
                  <p className="hidden font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted md:block">{heading as string}</p>
                  {(links as [string, string][]).map(([label, href]) => <Link key={label} href={href} className="text-[15px] font-semibold hover:text-primary">{label}</Link>)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 font-mono text-[11px] text-ink-muted md:flex-row md:justify-between md:text-[12px]">
            <span>© {new Date().getFullYear()} MediLink</span>
            <span>Not for emergencies. If it&apos;s urgent, go to the nearest hospital.</span>
          </div>
          <p aria-hidden="true" className="select-none whitespace-nowrap font-display text-[25vw] font-extrabold leading-[0.82] tracking-[-0.045em] text-[#E6DED2] md:text-[372px]">MediLink</p>
        </div>
      </footer>
    </main>
  );
}

/** Photo mosaic + app screen from the design's "Hero stage". */
function HeroStage() {
  return (
    <div className="mx-auto max-w-[1440px] px-3 md:px-8">
      <div className="relative overflow-hidden rounded-[28px] bg-[#E9DDCB] md:grid md:h-[700px] md:grid-cols-[minmax(0,1fr)_340px] md:gap-6 md:rounded-[36px] md:p-7">
        {/* Phone: photo on top, screen overlapping. Desktop: three-photo mosaic. */}
        <div className="relative h-[300px] md:flex md:h-auto md:flex-col md:gap-4">
          <div className="relative h-full md:h-[404px] md:shrink-0">
            <Photo src="photo-home.webp" alt="A doctor laughing with an older patient during a home visit" label="Home visit" icon="home" className="h-full md:rounded-[24px]" eager />
            <div className="absolute bottom-5 right-5 hidden w-[340px] items-center gap-3 rounded-[18px] bg-warm-white px-4 py-3.5 shadow-[0_16px_40px_rgba(31,27,23,0.22)] md:flex">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="check_circle" className="text-[22px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold">Dr. Ngozi Eze said yes</span>
                <span className="block text-[13px] text-ink-muted">Home visit · Today, 10:00 AM</span>
              </span>
              <span className="font-mono text-[11px] text-ink-muted">now</span>
            </div>
          </div>
          <div className="hidden min-h-0 flex-1 grid-cols-2 gap-4 md:grid">
            <Photo src="photo-video.webp" alt="A doctor on a video consultation with a patient on her laptop" label="Video call" icon="videocam" className="rounded-[24px]" />
            <Photo src="photo-clinic.webp" alt="A clinician taking a patient's blood pressure" label="At the clinic" icon="stethoscope" className="rounded-[24px]" />
          </div>
        </div>
        <div className="relative -mt-20 h-[300px] overflow-hidden md:mt-0 md:h-auto">
          <PhoneShot src="screen-choose-doctor.webp" alt="The Choose a doctor screen with the best match highlighted" className="mx-auto w-[290px] md:absolute md:left-0 md:top-3 md:w-[340px]" eager />
        </div>
      </div>
    </div>
  );
}

function Photo({ src, alt, label, icon, className, eager }: { src: string; alt: string; label: string; icon: string; className?: string; eager?: boolean }) {
  return (
    <figure className={cn("relative overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}/${src}`} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
      <figcaption className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-warm-white/90 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.07em]">
        <Icon name={icon} className="text-[14px]" />{label}
      </figcaption>
    </figure>
  );
}

function PhoneShot({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${IMG}/${src}`}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("rounded-[34px] border-[5px] border-ink shadow-[0_20px_50px_rgba(31,27,23,0.2)] md:rounded-[40px] md:border-[6px]", className)}
    />
  );
}
