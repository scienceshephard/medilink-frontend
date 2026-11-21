"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.auth.forgotPassword(email);
      setDevToken(res.reset_token ?? null);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell back="/login" title={sent ? "Check your email" : "Reset password"} panelTitle="Forgot it?" panelText="It happens. We'll email you a link to set a new password.">
      {sent ? (
        <>
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white p-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="mail" className="text-[30px]" /></span>
            <p className="text-[15px] text-ink-muted">If <b className="text-ink">{email}</b> has an account, a reset link is on its way.</p>
          </div>
          <p className="flex items-start gap-2 text-[13px] text-ink-muted"><Icon name="info" className="mt-0.5 text-[16px]" />Check your spam folder if it does not arrive in a few minutes.</p>
          {devToken && (
            <p className="rounded-xl bg-primary-soft p-3 text-[14px] text-ink">
              Dev mode — <Link href={`/reset-password?token=${devToken}`} className="font-bold text-primary underline">open the reset link</Link>
            </p>
          )}
          <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full bg-primary text-[17px] font-extrabold text-on-primary">Back to log in</Link>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-[15px] text-ink-muted">Enter the email on your account — we will send a link to set a new password.</p>
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
          <p className="flex items-start gap-2 text-[13px] text-ink-muted"><Icon name="info" className="mt-0.5 text-[16px]" />Check your spam folder if it does not arrive in a few minutes.</p>
          <Button full size="lg" loading={busy} type="submit">Send reset link</Button>
          <Link href="/login" className="text-center text-[14px] font-bold text-primary">Remembered it? Log in</Link>
        </form>
      )}
    </AuthShell>
  );
}
