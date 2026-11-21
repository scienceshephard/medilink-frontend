"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useAuth, homeForRole } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthSubmit } from "./AuthShell";

/** Email and password sign-in, shared by /login and /login/clinic. */
export function LoginForm({ emailLabel = "Email", emailPlaceholder = "you@example.com", submitLabel = "Log in", note }: {
  emailLabel?: string;
  emailPlaceholder?: string;
  submitLabel?: string;
  note: string;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const t = await login({ email, password });
      router.push(homeForRole(t.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Input label={emailLabel} icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={emailPlaceholder} required />
      <Input
        label="Password"
        icon="lock"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        labelAction={<Link href="/forgot-password" className="text-[14px] font-bold text-primary">Forgot password?</Link>}
        required
      />
      {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
      <AuthSubmit loading={loading}>{submitLabel}</AuthSubmit>
      <p className="flex items-center gap-2 font-mono text-[12px] text-ink-muted"><Icon name="lock" className="text-[14px]" />{note}</p>
    </form>
  );
}
