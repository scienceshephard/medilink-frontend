"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export default function AdminDoctorReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const pending = useApi(() => api.admin.pendingDoctors(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doctor = pending.data?.find((item) => item.id === id);

  async function act(action: "verify" | "reject") {
    if (!doctor || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (action === "verify") await api.admin.verifyDoctor(doctor.id);
      else await api.admin.suspendDoctor(doctor.id);
      setMessage(action === "verify" ? "Clinician verified." : "Clinician registration rejected.");
      window.setTimeout(() => router.push("/admin/doctors"), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this clinician.");
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isInteger(id) || id < 1) return <ReviewMessage title="Invalid clinician" body="The clinician ID in this link is invalid." />;
  if (pending.loading) return <div className="mx-auto flex max-w-2xl flex-col gap-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-72 rounded-[20px]" /></div>;
  if (pending.error) return <ReviewMessage title="Could not load credentials" body={pending.error} />;
  if (!doctor) return <ReviewMessage title="Application not found" body="This clinician is no longer in the pending verification queue." />;

  const expiry = doctor.license_expiry ? new Date(doctor.license_expiry) : null;
  const expiryValid = expiry && !Number.isNaN(expiry.getTime());
  const expired = expiryValid && expiry.getTime() < Date.now();
  const ready = doctor.credentials_complete && !expired;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link href="/admin/doctors" className="inline-flex w-fit items-center gap-1 font-bold text-primary"><Icon name="arrow_back" /> Back to clinicians</Link>
      <header>
        <p className="text-caption font-extrabold uppercase tracking-wide text-primary">Credential review</p>
        <h1 className="mt-1 text-headline-lg-mobile font-extrabold text-ink md:text-headline-lg">{doctor.name}</h1>
        <p className="text-body-md text-ink-muted">Review the submitted licensing details before granting access to patient requests.</p>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{message}</p>}

      <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5" aria-label="Submitted credentials">
        <Credential icon="mail" label="Email address" value={doctor.email} />
        <Credential icon="school" label="Qualifications" value={doctor.qualifications} />
        <Credential icon="account_balance" label="Licensing authority" value={doctor.licensing_authority} />
        <Credential icon="badge" label="License number" value={doctor.license_number} />
        <Credential icon="event" label="License expiry" value={expiryValid ? expiry.toLocaleDateString() : null} />
        <div className="flex items-start gap-3 border-t border-border pt-4">
          <Icon name={ready ? "verified_user" : "warning"} className={`mt-0.5 ${ready ? "text-accent" : "text-warning"}`} />
          <div>
            <p className="font-extrabold text-ink">{ready ? "Required details are present" : expired ? "License appears expired" : "Application is incomplete"}</p>
            <p className="text-caption text-ink-muted">The platform displays the applicant’s submission. Verify the license directly with the relevant Nigerian licensing body before approving.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => act("verify")} disabled={!ready || busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 font-extrabold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"><Icon name="verified" />{busy ? "Saving…" : "Verify clinician"}</button>
        <button onClick={() => act("reject")} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-border px-5 font-extrabold text-error disabled:opacity-50"><Icon name="block" />Reject application</button>
      </div>
    </main>
  );
}

function Credential({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  return <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2"><Icon name={icon} className="mt-0.5 text-primary" /><div><p className="text-caption text-ink-muted">{label}</p><p className="break-words font-bold text-ink">{value?.trim() || "Not provided"}</p></div></div>;
}

function ReviewMessage({ title, body }: { title: string; body: string }) {
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white p-8 text-center"><Icon name="description" className="text-[36px] text-primary" /><h1 className="text-headline-md font-extrabold text-ink">{title}</h1><p className="text-body-md text-ink-muted">{body}</p><Link href="/admin/doctors" className="mt-2 inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">Return to clinician queue</Link></div>;
}
