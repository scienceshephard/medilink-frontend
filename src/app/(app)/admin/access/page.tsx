"use client";

import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const ROLE_DETAILS = [
  { role: "Patient", icon: "person", description: "Can manage their own profile, describe symptoms, view recommendations, and manage visits." },
  { role: "Doctor", icon: "stethoscope", description: "Can manage a clinician profile and respond to patient requests after signing in." },
  { role: "Administrator", icon: "admin_panel_settings", description: "Can review clinician credentials, manage availability status, and inspect recommendation operations." },
];

export default function AdminAccessPage() {
  const policy = useApi(() => api.admin.accessPolicy(), []);

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <header>
        <p className="text-caption font-extrabold uppercase tracking-wide text-primary">Security</p>
        <h1 className="mt-1 text-headline-lg-mobile font-extrabold text-ink md:text-headline-lg">Access and roles</h1>
        <p className="text-body-md text-ink-muted">See how accounts receive access to MediLink today.</p>
      </header>

      {policy.error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{policy.error}</p>}
      <section className="rounded-[20px] border border-border bg-warm-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="admin_panel_settings" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-ink">Administrator account</p>
            {policy.loading ? <Skeleton className="mt-2 h-5 w-48" /> : <p className="break-all text-body-md text-ink-muted">{policy.data?.configured_admin_email}</p>}
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-soft px-3 py-1 text-caption font-bold text-warning"><Icon name="settings" className="text-[16px]" /> Single deployment-configured account</p>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-caption text-ink-muted"><Icon name="info" className="text-primary" />Administrator access is configured by the backend deployment environment. This application does not yet support inviting multiple administrators or granting roles from this screen.</div>

      <section className="flex flex-col gap-3">
        <h2 className="text-headline-md font-extrabold text-ink">Available roles</h2>
        {ROLE_DETAILS.map((item) => (
          <article key={item.role} className="flex items-start gap-3 rounded-[18px] border border-border bg-warm-white p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-primary"><Icon name={item.icon} /></span>
            <div className="min-w-0 flex-1"><h3 className="font-extrabold text-ink">{item.role}</h3><p className="text-caption text-ink-muted">{item.description}</p></div>
            {item.role === "Administrator" && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-caption font-bold text-accent">Configured</span>}
          </article>
        ))}
      </section>

      <section className="rounded-[20px] border border-border bg-warm-white p-5">
        <h2 className="font-extrabold text-ink">Clinician onboarding</h2>
        {policy.loading ? <Skeleton className="mt-3 h-5 w-56" /> : <p className="mt-1 text-body-md text-ink-muted">{policy.data?.doctor_approval_required ? "Doctor accounts require administrator credential review before their profiles are eligible for patient recommendations." : "Doctor accounts do not currently require administrator approval."}</p>}
      </section>
    </main>
  );
}
