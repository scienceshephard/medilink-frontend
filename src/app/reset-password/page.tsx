"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
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
    <div className="flex min-h-screen items-center justify-center bg-sand px-5">
      <Card className="w-full max-w-[440px]">
        <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-primary text-on-primary">
          <Icon name="lock" className="h-7 w-7" />
        </div>
        {done ? (
          <>
            <h1 className="mt-5 text-headline-md font-extrabold text-ink">Password updated</h1>
            <p className="mt-2 text-body-md text-ink-muted">Taking you to log in…</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-headline-md font-extrabold text-ink">Set a new password</h1>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" aria-label="New password" />
              <Input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repeat password" aria-label="Repeat password" />
              {error && <p className="text-body-sm text-ink-muted">{error}</p>}
              <Button full size="lg" loading={busy} type="submit">Update password</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
