"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDateTime, formatNaira } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { Skeleton } from "@/components/ui/Skeleton";
function CheckoutContent() {
  const params = useSearchParams();
  const consultationId = Number(params.get("consultation_id"));
  const visits = useApi(() => api.patients.consultations(), []);
  const doctors = useApi(() => api.doctors.list(), []);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const visit = useMemo(
    () => (visits.data ?? []).find((item) => item.id === consultationId) ?? null,
    [visits.data, consultationId],
  );
  const doctor = useMemo(
    () => doctors.data?.find((item) => item.id === visit?.doctor_id) ?? null,
    [doctors.data, visit?.doctor_id],
  );

  async function continueToPayment() {
    if (!visit || submitting) return;
    setSubmitting(true);
    setPaymentError(null);
    try {
      const result = await api.payments.initialize(visit.id);
      window.location.assign(result.authorization_url);
    } catch (error) {
      setPaymentError(
        error instanceof ApiError ? error.message : "We couldn’t start payment. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (!Number.isInteger(consultationId) || consultationId < 1) {
    return <CheckoutMessage title="Visit not found" body="Open payment from an accepted visit in My visits." />;
  }

  if (visits.loading) {
    return <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5"><Skeleton className="h-10 w-64" /><Skeleton className="h-56 rounded-[20px]" /></div>;
  }

  if (visits.error) {
    return <CheckoutMessage title="We couldn’t load this visit" body={visits.error} />;
  }

  if (!visit) {
    return <CheckoutMessage title="Visit not found" body="This visit may have been removed, or it belongs to another account." />;
  }

  const amount = visit.amount ?? doctor?.consultation_fee ?? null;
  const doctorName = doctor?.full_name ?? (visit.doctor_id ? `Doctor #${visit.doctor_id}` : "Your clinician");
  const specialties = doctor?.specialization_names?.join(" · ");
  const isPaid = visit.payment_status === "success" || visit.status === "scheduled";
  const canPay = visit.status === "accepted" && !isPaid;

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <header>
        <p className="text-caption font-extrabold uppercase tracking-wide text-primary">Your visit / Payment</p>
        <h1 className="mt-1 text-headline-lg-mobile font-extrabold text-ink md:text-headline-lg">Review and pay</h1>
        <p className="mt-1 max-w-2xl text-body-md text-ink-muted">Check the appointment details before continuing to secure payment.</p>
      </header>

      {paymentError && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{paymentError}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <section className="rounded-[20px] border border-[#C9DED2] bg-accent-soft p-5" aria-labelledby="visit-summary-heading">
            <p className="text-caption font-extrabold uppercase tracking-wide text-accent">Accepted appointment</p>
            <h2 id="visit-summary-heading" className="mt-2 text-body-lg font-extrabold text-ink">{doctorName}</h2>
            {specialties && <p className="text-body-md text-ink-muted">{specialties}</p>}
            <div className="mt-4 grid gap-3 border-t border-[#C9DED2] pt-4 sm:grid-cols-2">
              <p className="flex items-start gap-2 text-body-md text-ink"><Icon name="schedule" className="mt-0.5 text-accent" />{formatDateTime(visit.scheduled_datetime)}</p>
              <p className="flex items-start gap-2 text-body-md text-ink"><Icon name={visit.mode === "video" ? "videocam" : "home"} className="mt-0.5 text-accent" />{visit.mode === "video" ? "Video consultation" : "Home visit"}</p>
              {visit.location && <p className="flex items-start gap-2 text-body-md text-ink sm:col-span-2"><Icon name="location_on" className="mt-0.5 text-accent" />{visit.location}</p>}
            </div>
          </section>

          <section className="rounded-[20px] border border-border bg-warm-white p-5" aria-labelledby="payment-method-heading">
            <h2 id="payment-method-heading" className="font-extrabold text-ink">Secure payment</h2>
            <p className="mt-1 text-body-md text-ink-muted">Paystack will show the payment options available for your transaction, such as card, bank transfer, or USSD.</p>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-sand px-4 py-3 text-caption text-ink-muted"><Icon name="lock" className="mt-0.5 text-primary" />Your payment details are entered on Paystack. MediLink does not store your card details.</p>
          </section>

          {!canPay && !isPaid && (
            <p className="rounded-xl bg-amber-soft px-4 py-3 text-body-md font-bold text-warning">
              {visit.status === "requested" ? "Payment opens after the clinician accepts your visit." : `This visit is ${visit.status.replaceAll("_", " ")} and can’t be paid here.`}
            </p>
          )}
          {isPaid && <p className="rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">This visit has already been paid.</p>}
        </div>

        <aside className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5 lg:sticky lg:top-8">
          <h2 className="font-extrabold text-ink">Payment summary</h2>
          <div className="flex items-start justify-between gap-4 text-body-md"><span className="text-ink-muted">Consultation</span><span className="max-w-[60%] text-right font-bold text-ink">{doctorName}</span></div>
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4"><span className="text-body-md text-ink-muted">Amount due</span><span className="text-headline-md font-extrabold text-primary">{amount == null ? "Confirmed at checkout" : formatNaira(amount)}</span></div>
          <p className="text-caption text-ink-muted">The amount is set by the clinician and verified by the payment provider.</p>
          <button onClick={continueToPayment} disabled={!canPay || submitting} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-extrabold text-on-primary disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Connecting securely…</> : <><Icon name="lock" /> Continue to Paystack</>}
          </button>
          <Link href="/appointments" className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-border px-4 font-bold text-ink">Back to My visits</Link>
        </aside>
      </div>
    </div>
  );
}

function CheckoutMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white p-8 text-center">
      <Icon name="receipt_long" className="text-[36px] text-primary" />
      <h1 className="text-headline-md font-extrabold text-ink">{title}</h1>
      <p className="text-body-md text-ink-muted">{body}</p>
      <Link href="/appointments" className="mt-2 inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">Go to My visits</Link>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return <Suspense fallback={<div className="py-16 text-center"><Loader /></div>}><CheckoutContent /></Suspense>;
}
