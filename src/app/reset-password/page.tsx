"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-32 h-64 w-full max-w-[440px] rounded-[24px]" />}>
      <ResetContent />
    </Suspense>
  );
}

function ResetContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, pw);
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed — the link may have expired.");
      setBusy(false);
    }
  }

  return (
    <AuthShell back="/login" title={done ? "Password updated" : "Set a new password"} panelTitle="Almost there." panelText="Choose a new password with at least 8 characters.">
      {done ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white p-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="check_circle" className="text-[30px]" /></span>
          <p className="text-[15px] text-ink-muted">Taking you to log in…</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="New password" type="password" autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
          <Input label="Repeat password" type="password" autoComplete="new-password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
          <Button full size="lg" loading={busy} type="submit">Update password</Button>
          <Link href="/forgot-password" className="text-center text-[14px] font-bold text-primary">Need a new link?</Link>
        </form>
      )}
    </AuthShell>
  );
}
