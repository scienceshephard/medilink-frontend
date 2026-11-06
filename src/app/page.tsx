"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homeForRole } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";

const SAND = "#F6EFE4";
const WARM = "#FFFDF8";
const INK = "#2B2621";
const MUTED = "#6B6259";
const BORDER = "#E4D9C7";
const TERRA = "#D96B4A";
const TERRA_SOFT = "#F7E1D8";
const GREEN = "#2E6B4F";
const GREEN_SOFT = "#DCEBE1";

export default function Welcome() {
  const router = useRouter();
  const { role, ready } = useAuth();
  useEffect(() => { if (ready && role) router.replace(homeForRole(role)); }, [ready, role, router]);

  return (
    <main className="min-h-screen text-[15px]" style={{ background: SAND, color: INK }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b" style={{ background: `${WARM}F2`, borderColor: BORDER, backdropFilter: "blur(8px)" }}>
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-[14px]" style={{ background: TERRA }}>
              <Icon name="favorite" className="h-5 w-5 text-white" />
            </span>
            <span className="text-[22px] font-extrabold tracking-tight">MediLink</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[14px] font-bold md:flex" style={{ color: MUTED }}>
            <a href="#how" className="hover:text-[#2B2621]">How it works</a>
            <a href="#ways" className="hover:text-[#2B2621]">Ways to get care</a>
            <Link href="/register?role=doctor" className="hover:text-[#2B2621]">For clinicians</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden h-11 items-center rounded-full px-5 text-[14px] font-extrabold sm:inline-flex" style={{ color: GREEN }}>Sign in</Link>
            <Link href="/register" className="inline-flex h-11 items-center rounded-full px-5 text-[14px] font-extrabold text-white sm:px-6" style={{ background: TERRA }}>Get care</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:pb-24 lg:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-widest" style={{ background: TERRA_SOFT, color: TERRA }}>
            <Icon name="favorite" className="h-4 w-4" /> A more personal kind of care
          </p>
          <h1 className="mt-5 text-[44px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px] lg:text-[64px]">
            A doctor who listens. Care that comes closer.
          </h1>
          <p className="mt-5 max-w-[480px] text-[17px] leading-8" style={{ color: MUTED }}>
            Describe how you feel in your own words. Meet a clinician who fits — at your home, at their clinic, or over video.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="inline-flex h-14 items-center gap-2 rounded-full px-8 text-[16px] font-extrabold text-white" style={{ background: TERRA }}>
              Find care <Icon name="arrow_forward" className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex h-14 items-center rounded-full border-2 px-8 text-[16px] font-extrabold" style={{ borderColor: BORDER, color: INK, background: WARM }}>
              I have an account
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-bold" style={{ color: MUTED }}>
            <span className="flex items-center gap-2"><Icon name="verified_user" className="h-5 w-5" style={{ color: GREEN }} />Credentials reviewed by people</span>
            <span className="flex items-center gap-2"><Icon name="lock" className="h-5 w-5" style={{ color: GREEN }} />You choose what to share</span>
          </div>
        </div>

        {/* Hero visual — a care-request card composition built from real UI pieces */}
        <div className="relative mx-auto w-full max-w-[460px]">
          <div className="rounded-[28px] border p-5 shadow-sm" style={{ background: WARM, borderColor: BORDER }}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: TERRA_SOFT, color: TERRA }}><Icon name="person" className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">Ada, 29</p>
                <p className="text-[13px]" style={{ color: MUTED }}>Headache, dizziness · 2.4 km away</p>
              </div>
              <span className="rounded-full px-3 py-1 text-[11px] font-extrabold" style={{ background: "#FBEEDB", color: "#B07A1E" }}>Moderate</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Headache", "Dizziness", "Tiredness"].map((t) => (
                <span key={t} className="rounded-full border px-3 py-1.5 text-[12px] font-bold" style={{ borderColor: BORDER, color: MUTED }}>{t}</span>
              ))}
            </div>
            <p className="mt-4 rounded-2xl p-4 text-[14px] leading-6" style={{ background: SAND, color: MUTED }}>
              “Headache since Monday, comes with dizziness when I stand. Worse in the evenings.”
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span className="flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-extrabold text-white" style={{ background: GREEN }}>
                <Icon name="check" className="h-5 w-5" /> Accept
              </span>
              <span className="flex h-12 items-center justify-center rounded-full border-2 text-[14px] font-extrabold" style={{ borderColor: BORDER }}>Decline</span>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border p-4 shadow-sm sm:block lg:-left-10" style={{ background: WARM, borderColor: BORDER }}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: GREEN_SOFT, color: GREEN }}><Icon name="home_health" className="h-5 w-5" /></span>
              <div>
                <p className="text-[13px] font-extrabold">Home visit · 10:00</p>
                <p className="text-[12px]" style={{ color: MUTED }}>Dr. Eze is on the way</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -top-6 hidden rounded-2xl border p-4 shadow-sm sm:block lg:-right-8" style={{ background: WARM, borderColor: BORDER }}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: TERRA_SOFT, color: TERRA }}><Icon name="star" className="h-5 w-5" /></span>
              <div>
                <p className="text-[13px] font-extrabold">4.9 rating</p>
                <p className="text-[12px]" style={{ color: MUTED }}>128 visits</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ways to get care ── */}
      <section id="ways" className="border-y" style={{ background: WARM, borderColor: BORDER }}>
        <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-20">
          <p className="text-[12px] font-extrabold uppercase tracking-widest" style={{ color: TERRA }}>Care, your way</p>
          <h2 className="mt-3 text-[32px] font-extrabold tracking-tight sm:text-[40px]">Three ways to feel better.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              { icon: "home_health", title: "Come to me", body: "A verified clinician visits you at home — same day when they're nearby.", bg: TERRA_SOFT, fg: TERRA },
              { icon: "local_hospital", title: "Visit a clinic", body: "Book a slot at a clinic near you and walk in when it's your turn.", bg: GREEN_SOFT, fg: GREEN },
              { icon: "videocam", title: "Video call", body: "Talk to a clinician from anywhere — no travel, no waiting room.", bg: TERRA_SOFT, fg: TERRA },
            ].map((c) => (
              <article key={c.title} className="rounded-[24px] border p-6" style={{ background: SAND, borderColor: BORDER }}>
                <span className="grid h-12 w-12 place-items-center rounded-[14px]" style={{ background: c.bg, color: c.fg }}><Icon name={c.icon} className="h-6 w-6" /></span>
                <h3 className="mt-4 text-[20px] font-extrabold">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-6" style={{ color: MUTED }}>{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-widest" style={{ color: TERRA }}>A thoughtful first step</p>
            <h2 className="mt-3 text-[32px] font-extrabold tracking-tight sm:text-[40px]">Tell us how you feel. We find who fits.</h2>
            <p className="mt-4 max-w-[420px] text-[15px] leading-7" style={{ color: MUTED }}>
              MediLink matches what you describe — in plain words — with clinicians whose practice fits your symptoms, language, and location.
            </p>
            <Link href="/register" className="mt-7 inline-flex h-13 items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-extrabold text-white" style={{ background: GREEN }}>
              Start now <Icon name="arrow_forward" className="h-5 w-5" />
            </Link>
          </div>
          <ol className="space-y-5">
            {[
              ["1", "Describe it in your own words", "No diagnosis needed. " + "\"Headache since Monday\" is enough — we translate it."],
              ["2", "See who fits, and why", "Each suggestion explains itself — specialty, distance, language, ratings."],
              ["3", "Book, meet, and follow up", "Your clinician sends a care plan after the visit. Outcomes improve the next match."],
            ].map(([n, title, body]) => (
              <li key={n} className="flex gap-4 rounded-[24px] border p-5" style={{ background: WARM, borderColor: BORDER }}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[17px] font-extrabold text-white" style={{ background: TERRA }}>{n}</span>
                <div>
                  <h3 className="text-[18px] font-extrabold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-6" style={{ color: MUTED }}>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── For clinicians ── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8 lg:pb-24">
        <div className="grid items-center gap-8 rounded-[28px] p-8 sm:p-12 lg:grid-cols-2" style={{ background: GREEN }}>
          <div>
            <h2 className="text-[28px] font-extrabold tracking-tight text-white sm:text-[36px]">Are you a clinician?</h2>
            <p className="mt-3 max-w-[420px] text-[15px] leading-7 text-white/85">
              Join MediLink to receive care requests matched to your practice, set your own availability, and do home visits on your terms.
            </p>
            <Link href="/register?role=doctor" className="mt-7 inline-flex h-13 items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-extrabold" style={{ color: GREEN }}>
              Join as a clinician <Icon name="arrow_forward" className="h-5 w-5" />
            </Link>
          </div>
          <div className="grid gap-3">
            {[
              ["inbox", "Requests matched to your specialty"],
              ["event_available", "Your times, your rules"],
              ["edit_note", "Care plans your patients actually follow"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white"><Icon name={icon} className="h-5 w-5" /></span>
                <p className="text-[15px] font-bold text-white">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t px-5 py-6 text-center text-[12px]" style={{ borderColor: BORDER, color: MUTED }}>
        MediLink connects you with clinicians — it does not diagnose or replace emergency care. In an emergency, call your local emergency number.
      </footer>
    </main>
  );
}
