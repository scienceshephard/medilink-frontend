"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, homeForRole } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";

export default function Welcome() {
  const router = useRouter();
  const { role, ready } = useAuth();
  useEffect(() => { if (ready && role) router.replace(homeForRole(role)); }, [ready, role, router]);

  return <main className="min-h-screen bg-[#FCFBF8] text-[#19352E]">
    <header className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 border-b border-[#E4E9E5] px-5 sm:px-8 lg:px-[5.4%]">
      <Link href="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#286653] text-white"><Icon name="add" /></span><span className="font-serif text-[23px] font-bold tracking-[-.04em]">MediLink</span></Link>
      <nav className="hidden items-center gap-7 text-[13px] font-semibold text-[#65756F] md:flex"><a href="#how-it-works" className="hover:text-[#286653]">How it works</a><a href="#care" className="hover:text-[#286653]">Find a doctor</a><Link href="/register?role=doctor" className="hover:text-[#286653]">For clinicians</Link></nav>
      <div className="flex items-center gap-2"><Link href="/login" className="hidden rounded-full px-4 py-2 text-[13px] font-bold text-[#286653] hover:bg-[#EAF3EE] sm:inline-flex">Sign in</Link><Link href="/register" className="inline-flex h-10 items-center rounded-full bg-[#286653] px-5 text-[13px] font-bold text-white hover:bg-[#1F5544]">Get care</Link></div>
    </header>

    <section className="mx-auto grid min-h-[610px] max-w-[1440px] items-center gap-9 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_.92fr] lg:px-[5.4%] lg:py-14">
      <div className="max-w-[600px] py-5">
        <p className="text-[12px] font-bold uppercase tracking-[.17em] text-[#65756F]">A more personal kind of care</p>
        <h1 className="mt-4 font-serif text-[clamp(44px,6.2vw,76px)] leading-[1.02] tracking-[-.055em] text-[#19352E]">A doctor who listens. Care that comes closer.</h1>
        <p className="mt-5 max-w-[510px] text-[16px] leading-7 text-[#65756F]">Tell us how you feel. Meet a clinician who fits your needs. Choose together whether to start online or arrange a home visit.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3"><Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#286653] px-6 text-[14px] font-bold text-white hover:bg-[#1F5544]">Find care <Icon name="arrow_forward" /></Link><Link href="/login" className="inline-flex h-12 items-center rounded-full border border-[#D7E1DB] px-6 text-[14px] font-bold text-[#286653] hover:bg-white">I have an account</Link></div>
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-[#65756F]"><span className="flex items-center gap-1.5"><Icon name="verified_user" className="text-[17px] text-[#286653]" />Clinician credentials reviewed</span><span className="flex items-center gap-1.5"><Icon name="lock" className="text-[17px] text-[#286653]" />You choose what to share</span></div>
      </div>
      <div className="relative min-h-[340px] overflow-hidden rounded-[28px] bg-[#EAF3EE] sm:min-h-[440px] lg:min-h-[500px]">
        <div className="absolute inset-0 bg-cover bg-center" role="img" aria-label="Doctor speaking with a patient" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#19352E]/45 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-[310px] sm:p-5"><span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#286653]"><Icon name="favorite" fill />Care, built around you</span><p className="mt-2 font-serif text-[21px] leading-tight text-[#19352E]">A familiar clinician can make it easier to ask questions and feel heard.</p></div>
      </div>
    </section>

    <section id="how-it-works" className="bg-white"><div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-[5.4%] lg:py-16"><div className="max-w-[630px]"><p className="text-[12px] font-bold uppercase tracking-[.16em] text-[#65756F]">A thoughtful first step</p><h2 className="mt-2 font-serif text-[clamp(32px,4vw,46px)] leading-tight tracking-[-.035em]">A more personal way to find care.</h2><p className="mt-3 text-[15px] leading-7 text-[#65756F]">MediLink helps you find suitable doctors near your area and stay connected as your care continues.</p></div>
      <div className="mt-9 grid gap-7 md:grid-cols-3">{[["01", "Start in your own words", "Explain what’s going on without needing to know a diagnosis."], ["02", "Compare your options", "See relevant clinicians with nearby options easy to compare."], ["03", "Choose what feels right", "Continue the conversation and decide together what comes next."]].map(([n, title, body]) => <article key={n} className="border-t border-[#D7E1DB] pt-4"><span className="text-[12px] font-bold tracking-[.15em] text-[#286653]">{n}</span><h3 className="mt-2 font-serif text-[23px]">{title}</h3><p className="mt-2 max-w-[330px] text-[13px] leading-6 text-[#65756F]">{body}</p></article>)}</div>
    </div></section>

    <section id="care" className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-[5.4%] lg:py-14"><div><h2 className="font-serif text-[30px] tracking-[-.03em]">Start a conversation about your care.</h2><p className="mt-2 text-[14px] text-[#65756F]">Your health information is private. You decide what to share and when.</p></div><Link href="/register" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#286653] px-6 text-[14px] font-bold text-white">Get started <Icon name="arrow_forward" /></Link></section>
    <footer className="border-t border-[#E4E9E5] px-5 py-5 text-center text-[11px] text-[#65756F]">MediLink helps you connect with clinicians. It does not diagnose or replace emergency care.</footer>
  </main>;
}
