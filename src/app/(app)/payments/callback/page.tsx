"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { formatNaira } from "@/lib/format";
import type { PaymentOut } from "@/lib/types";

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");

  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [payment, setPayment] = useState<PaymentOut | null>(null);
  const [message, setMessage] = useState<string>("");

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
        setMessage(err instanceof ApiError ? err.message : "Verification failed.");
      });
  }, [reference]);

  const ok = payment?.status === "success";

  return (
    <div className="mx-auto max-w-md">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        {state === "loading" ? (
          <>
            <Loader />
            <p className="text-body-md text-on-surface-variant">Confirming your payment…</p>
          </>
        ) : state === "error" ? (
          <>
            <Icon name="error" className="text-[48px] text-error" />
            <h1 className="text-headline-md text-on-surface">Payment not confirmed</h1>
            <p className="text-body-md text-on-surface-variant">{message}</p>
          </>
        ) : (
          <>
            <Icon
              name={ok ? "check_circle" : "cancel"}
              fill
              className={`text-[48px] ${ok ? "text-secondary" : "text-error"}`}
            />
            <h1 className="text-headline-md text-on-surface">
              {ok ? "Payment successful" : "Payment not completed"}
            </h1>
            {payment && (
              <p className="text-body-md text-on-surface-variant">
                {ok
                  ? `You paid ${formatNaira(payment.amount)}. Your appointment is confirmed.`
                  : `Status: ${payment.status}.`}
              </p>
            )}
          </>
        )}

        <Link href="/appointments" className="mt-2 w-full">
          <Button full variant={ok ? "primary" : "outline"}>
            <Icon name="calendar_month" className="text-base" />
            Go to My Appointments
          </Button>
        </Link>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-8 text-center"><Loader /></div>}>
      <CallbackInner />
    </Suspense>
  );
}
