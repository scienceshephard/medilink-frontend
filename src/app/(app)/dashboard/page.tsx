"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export default function PatientHome() {
  const profile = useApi(() => api.patients.me(), []);
  const visits = useApi(() => api.patients.consultations(), []);
  const doctorList = useApi(() => api.doctors.list(), []);
  const doctors = new Map((doctorList.data ?? []).map((doctor) => [doctor.id, doctor]));
  const nextVisit = (visits.data ?? []).filter((visit) => ["requested", "accepted", "scheduled"].includes(visit.status)).sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime())[0];
  const firstName = profile.data?.full_name?.trim().split(/\s+/)[0];
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 lg:gap-11">
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#e9eee6] px-6 py-8 sm:px-10 sm:py-10 lg:min-h-[330px] lg:px-14 lg:py-12">
      <div className="relative z-10 max-w-[610px]">
        <p className="mb-3 text-[13px] font-bold uppercase tracking-[.16em] text-[#567264]">{greeting}{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="max-w-[560px] font-serif text-[clamp(38px,5.2vw,64px)] leading-[1.03] tracking-[-.045em] text-[#243c32]">Good care starts with a conversation.</h1>
        <p className="mt-4 max-w-[470px] text-[16px] leading-7 text-[#586a60]">Tell us what has been bothering you. We’ll help you find a clinician who fits your needs and is close to you.</p>
        <Link href="/find-care" className="mt-7 inline-flex h-12 items-center gap-3 rounded-full bg-[#286653] px-6 text-[14px] font-bold text-white transition hover:bg-[#1f5544]">Talk about how you feel <Icon name="arrow_forward" className="text-[18px]" /></Link>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-9 hidden h-[390px] w-[390px] overflow-hidden rounded-full border-[22px] border-white/55 bg-[#d3e0d4] lg:block">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85')" }} />
        <div className="absolute inset-0 bg-[#214a3b]/10" />
      </div>
      <div className="absolute bottom-7 right-[29%] hidden rounded-2xl bg-white/90 px-4 py-3 shadow-sm xl:block"><span className="flex items-center gap-2 text-[13px] font-bold text-[#286653]"><Icon name="favorite" fill /> Care that comes to you</span></div>
    </section>

    <section className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div className="flex flex-col justify-center">
        <p className="text-[12px] font-bold uppercase tracking-[.16em] text-[#77837b]">A simple way forward</p>
        <h2 className="mt-2 font-serif text-[32px] leading-tight tracking-[-.035em] text-[#243c32]">Care that meets you where you are.</h2>
        <p className="mt-3 max-w-[510px] text-[15px] leading-7 text-[#647169]">Start with a private description, review your clinician matches, then choose a clinic, video, or home visit where available.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[["edit_note", "Tell your story"], ["person_search", "Meet your matches"], ["home_health", "Choose how to meet"]].map(([icon, title], i) => <div key={title} className="border-t border-[#dfe4dd] pt-3"><span className="text-[12px] font-bold text-[#94a098]">0{i + 1}</span><p className="mt-1 flex items-center gap-2 text-[14px] font-bold text-[#33473d]"><Icon name={icon} className="text-[18px] text-[#48826a]" />{title}</p></div>)}
        </div>
      </div>
      <div className="rounded-[24px] border border-[#e3e6df] bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-[#edf0eb] pb-4"><div><p className="text-[12px] font-bold uppercase tracking-[.13em] text-[#77837b]">Your care</p><h2 className="mt-1 font-serif text-[25px] text-[#243c32]">Next visit</h2></div><Icon name="calendar_month" className="text-[25px] text-[#48826a]" /></div>
        {nextVisit ? <div className="pt-5">
          <p className="text-[14px] font-bold text-[#33473d]">{(nextVisit.doctor_id != null ? doctors.get(nextVisit.doctor_id)?.full_name : null) ?? "Your clinician"}</p>
          <p className="mt-1 text-[13px] text-[#77837b]">{formatDateTime(nextVisit.scheduled_datetime)}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#edf3ed] px-3 py-1.5 text-[12px] font-bold capitalize text-[#286653]"><span className="h-1.5 w-1.5 rounded-full bg-[#428465]" />{nextVisit.status.replaceAll("_", " ")}</p>
          <Link href="/appointments" className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full border border-[#d9ded8] text-[13px] font-bold text-[#34473e] hover:bg-[#f7f8f5]">View visit details <Icon name="arrow_forward" className="text-[18px]" /></Link>
        </div> : <div className="pt-5"><p className="text-[14px] leading-6 text-[#68746d]">Your upcoming appointments and clinician replies will appear here.</p><Link href="/appointments" className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-[#286653]">View all visits <Icon name="arrow_forward" className="text-[18px]" /></Link></div>}
      </div>
    </section>

    <section className="flex flex-col gap-4 border-t border-[#e3e6df] pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-serif text-[24px] text-[#243c32]">Keep your care information current</h2><p className="mt-1 text-[14px] text-[#68746d]">Your preferences help clinicians understand what matters to you.</p></div>
      <Link href="/profile" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#cbd5cc] px-5 text-[13px] font-bold text-[#286653] hover:bg-[#edf3ed]">Your health information <Icon name="arrow_forward" className="text-[18px]" /></Link>
    </section>
  </div>;
}
