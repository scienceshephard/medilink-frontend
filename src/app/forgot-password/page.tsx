"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
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
    <div className="flex min-h-screen items-center justify-center bg-sand px-5">
      <Card className="w-full max-w-[440px]">
        <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-primary text-on-primary">
          <Icon name="lock" className="h-7 w-7" />
        </div>
        {sent ? (
          <>
            <h1 className="mt-5 text-headline-md font-extrabold text-ink">Check your email</h1>
            <p className="mt-2 text-body-md text-ink-muted">
              If <b>{email}</b> has an account, a reset link is on its way. Check your spam folder if it does not arrive.
            </p>
            {devToken && (
              <p className="mt-3 rounded-[12px] bg-primary-soft p-3 text-body-sm text-ink">
                Dev mode — <Link href={`/reset-password?token=${devToken}`} className="font-bold text-primary underline">open the reset link</Link>
              </p>
            )}
            <Link href="/login" className="mt-5 block text-center text-body-md font-bold text-primary">Back to log in</Link>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-headline-md font-extrabold text-ink">Reset password</h1>
            <p className="mt-2 text-body-md text-ink-muted">
              Enter the email on your account — we will send a link to set a new password.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@example.com"
                aria-label="Email"
              />
              <Button full size="lg" loading={busy} type="submit">Send reset link</Button>
              <p className="text-center text-body-md">
                <Link href="/login" className="font-bold text-primary">Remembered it? Log in</Link>
              </p>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
