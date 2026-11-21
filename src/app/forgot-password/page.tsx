"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { AuthShell, AuthSubmit } from "@/components/app/AuthShell";
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
    <AuthShell
      photo="home"
      card={{ title: "Your details stay private", body: "Only the doctors you choose can see them", icon: "lock" }}
      topText="Remembered it?"
      topLink={{ label: "Log in", href: "/login" }}
      eyebrow="Reset password"
      title={sent ? "Check your email." : "Forgot your password?"}
      subtitle={sent
        ? <>If <b className="text-ink">{email}</b> has an account, a reset link is on its way.</>
        : "Enter the email on your account and we'll send you a link to set a new one."}
    >
      {sent ? (
        <>
          {devToken && (
            <p className="rounded-xl bg-primary-soft p-3 text-[14px] text-ink">
              Dev mode — <Link href={`/reset-password?token=${devToken}`} className="font-bold text-primary underline">open the reset link</Link>
            </p>
          )}
          <SpamNote />
          <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full border-[1.5px] border-ink text-[17px] font-extrabold transition hover:bg-ink hover:text-white">Back to log in</Link>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input label="Email" icon="mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
          <AuthSubmit loading={busy}>Send reset link</AuthSubmit>
          <SpamNote />
        </form>
      )}
    </AuthShell>
  );
}

function SpamNote() {
  return (
    <p className="flex items-start gap-2.5 rounded-2xl bg-[#EFE8DD] px-4 py-3.5 text-[14px] leading-[1.5] text-ink-muted">
      <Icon name="info" className="mt-0.5 text-[18px]" />Check your spam folder if it doesn&apos;t arrive in a few minutes.
    </p>
  );
}
