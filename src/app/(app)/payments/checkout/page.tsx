"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDateTime, formatNaira } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
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

  const modeLabel = visit.mode === "video" ? "Video visit" : visit.mode === "home_visit" ? "Home visit" : "Clinic visit";
  const card = "rounded-[20px] border border-border bg-warm-white p-4 md:p-5";

  return (
    <div className="flex flex-col gap-4 md:max-w-[720px] md:gap-5">
      <PageHeader back="/appointments" title="Review and pay" />

      {paymentError && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{paymentError}</p>}

      <section className={card} aria-label="Your visit">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="person" className="text-[26px]" /></span>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-extrabold text-ink">{doctorName}</p>
            <p className="truncate text-[14px] text-ink-muted">{modeLabel}{specialties ? ` · ${specialties}` : ""}</p>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-[14px] font-bold text-ink">
          <Icon name="schedule" className="mt-0.5 text-[18px] text-ink-muted" />
          <span>{formatDateTime(visit.scheduled_datetime)}{visit.location ? ` · ${visit.location}` : ""}</span>
        </div>
      </section>

      <section className={card} aria-label="Price">
        <div className="flex items-center justify-between py-1 text-[15px]"><span className="text-ink-muted">Consultation</span><span className="font-bold text-ink">{amount == null ? "—" : formatNaira(amount)}</span></div>
        {visit.mode === "home_visit" && <div className="flex items-center justify-between py-1 text-[15px]"><span className="text-ink-muted">Home visit</span><span className="font-bold text-ink">Included</span></div>}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3"><span className="text-[17px] font-extrabold text-ink">Total</span><span className="text-[20px] font-extrabold text-primary">{amount == null ? "Shown at checkout" : formatNaira(amount)}</span></div>
      </section>

      <section className={cn(card, "flex items-center gap-3")} aria-label="Payment method">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="payments" className="text-[22px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-extrabold text-ink">Paystack</p>
          <p className="text-[13px] text-ink-muted">Card, bank transfer or USSD — opens securely</p>
        </div>
      </section>
      <p className="flex items-start gap-1.5 text-[13px] text-ink-muted"><Icon name="lock" className="mt-0.5 text-[15px]" />You enter your payment details on Paystack. MediLink never stores your card.</p>

      {!canPay && !isPaid && (
        <p className="rounded-xl bg-amber-soft px-4 py-3 text-[15px] font-bold text-[#8A5A12]">
          {visit.status === "requested" ? "Payment opens after the doctor accepts your visit." : `This visit is ${visit.status.replaceAll("_", " ")} and can’t be paid here.`}
        </p>
      )}
      {isPaid && <p className="rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">This visit has already been paid.</p>}

      <button onClick={continueToPayment} disabled={!canPay || submitting} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-[18px] font-extrabold text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Connecting securely…</> : <><Icon name="lock" className="text-[20px]" /> {amount ? `Pay ${formatNaira(amount)}` : "Continue to payment"}</>}
      </button>
    </div>
  );
}

function CheckoutMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader back="/appointments" title="Review and pay" />
      <EmptyState icon="receipt_long" title={title} action={{ href: "/appointments", label: "Go to My visits" }}>{body}</EmptyState>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return <Suspense fallback={<div className="py-16 text-center"><Loader /></div>}><CheckoutContent /></Suspense>;
}
