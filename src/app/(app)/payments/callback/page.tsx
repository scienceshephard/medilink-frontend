"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { formatNaira } from "@/lib/format";
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

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
      {state === "loading" ? (
        <>
          <Loader />
          <p className="text-body-md text-ink-muted">Checking your payment…</p>
        </>
      ) : state === "error" ? (
        <>
          <span className="grid h-20 w-20 place-items-center rounded-full bg-red-soft text-error"><Icon name="error" className="text-[44px]" /></span>
          <h1 className="text-headline-md font-extrabold text-ink">Not confirmed</h1>
          <p className="text-body-md text-ink-muted">{message}</p>
        </>
      ) : (
        <>
          <span className={`grid h-20 w-20 place-items-center rounded-full ${ok ? "bg-accent-soft text-accent" : pending ? "bg-amber-soft text-warning" : "bg-red-soft text-error"}`}>
            <Icon name={ok ? "check_circle" : pending ? "hourglass_top" : "cancel"} fill className="text-[44px]" />
          </span>
          <h1 className="text-headline-md font-extrabold text-ink">
            {ok ? "Payment done" : pending ? "Waiting for confirmation" : payment?.status === "refunded" ? "Payment refunded" : "Payment not completed"}
          </h1>
          {payment && (
            <p className="text-body-md text-ink-muted">
              {ok
                ? `You paid ${formatNaira(payment.amount)}. Your visit is confirmed.`
                : pending
                  ? "Your payment provider is still confirming this transaction. Wait before trying to pay again."
                  : payment.status === "refunded"
                    ? `A late payment of ${formatNaira(payment.amount)} is being returned because the visit time was released.`
                    : `The payment was not completed (${payment.status}). You can return to My visits and try again if the visit is still awaiting payment.`}
            </p>
          )}
        </>
      )}
      {state === "done" && pending && (
        <button onClick={checkAgain} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-border font-extrabold text-ink">
          <Icon name="refresh" /> Check payment status again
        </button>
      )}
      <Link href="/appointments" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary">
        <Icon name="calendar_month" /> See my visits
      </Link>
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
