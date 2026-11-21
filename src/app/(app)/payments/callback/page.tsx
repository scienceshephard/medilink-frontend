"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { PaymentOut } from "@/lib/types";

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [payment, setPayment] = useState<PaymentOut | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setState("error");
      setMessage("Missing payment reference.");
      return;
    }
    api.payments
      .verify(reference)
      .then((p) => {
        setPayment(p);
        setState("done");
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "We could not confirm the payment.");
      });
  }, [reference]);

  const ok = payment?.status === "success";
  const pending = payment?.status === "pending";

  async function checkAgain() {
    if (!reference) return;
    setState("loading");
    setMessage("");
    try {
      const result = await api.payments.verify(reference);
      setPayment(result);
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(err instanceof ApiError ? err.message : "We could not confirm the payment.");
    }
  }

  const failed = state === "error" || (state === "done" && !ok && !pending);
  const title = state === "loading" || pending ? "Checking payment…"
    : ok ? "Payment received"
    : payment?.status === "refunded" ? "Payment refunded"
    : "Not confirmed";
  const body = state === "loading" ? "We are confirming with Paystack — this can take up to a minute. Do not close this page."
    : state === "error" ? message
    : ok ? `You paid ${formatNaira(payment!.amount)}. Your visit is confirmed.`
    : pending ? "Paystack is still confirming this payment. Wait before trying to pay again."
    : payment?.status === "refunded" ? `A late payment of ${formatNaira(payment.amount)} is being returned because the visit time was released.`
    : `The payment was not completed (${payment?.status}). If the visit still needs payment, you can try again from My visits.`;
  const tone = ok ? "bg-accent-soft text-accent" : failed ? "bg-red-soft text-face-worse" : "bg-amber-soft text-face-same";
  const icon = ok ? "check_circle" : failed ? "error" : "hourglass_top";

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 py-6 md:py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={`grid h-24 w-24 place-items-center rounded-full ${tone}`}>
          <Icon name={icon} className={`text-[48px] ${state === "loading" ? "animate-pulse" : ""}`} />
        </span>
        <h1 className="text-[26px] font-extrabold text-ink">{title}</h1>
        {ok && payment && <p className="text-[13px] text-ink-muted">Ref {payment.reference}{payment.paid_at ? ` · ${formatDateTime(payment.paid_at)}` : ""}</p>}
        <p className="text-[15px] text-ink-muted">{body}</p>
      </div>

      {ok && payment && (
        <>
          <section className="rounded-[20px] border border-border bg-warm-white px-4 py-2">
            {[["Status", "Successful"], ["Method", "Paystack"], ["Reference", payment.reference]].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-[14px]">
                <span className="text-ink-muted">{label}</span><span className="truncate font-bold text-ink">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5"><span className="text-[15px] font-extrabold text-ink">Total</span><span className="text-[17px] font-extrabold text-primary">{formatNaira(payment.amount)}</span></div>
          </section>
          <div className="flex items-center gap-3 rounded-[20px] border border-border bg-warm-white p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="event_available" className="text-[22px]" /></span>
            <div><p className="font-extrabold text-ink">Your visit is confirmed</p><p className="text-[13px] text-ink-muted">You can see the time and details in My visits.</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/appointments" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-primary font-extrabold text-on-primary"><Icon name="calendar_month" className="text-[18px]" /> View visit</Link>
            <button onClick={() => window.print()} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-warm-white font-extrabold text-ink"><Icon name="receipt_long" className="text-[18px]" /> Receipt</button>
          </div>
        </>
      )}

      {failed && (
        <div className="rounded-[20px] border border-border bg-warm-white p-4">
          <p className="font-extrabold text-ink">Your visit status is in My visits.</p>
          <p className="mt-1 text-[13px] text-ink-muted">If the status is unclear, contact support before paying again.</p>
        </div>
      )}

      {state === "done" && pending && (
        <button onClick={checkAgain} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-warm-white font-extrabold text-ink">
          <Icon name="refresh" /> Check again
        </button>
      )}
      {!ok && state !== "loading" && (
        <Link href="/appointments" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[17px] font-extrabold text-on-primary">
          <Icon name="calendar_month" /> See my visits
        </Link>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center"><Loader /></div>}>
      <CallbackInner />
    </Suspense>
  );
}
