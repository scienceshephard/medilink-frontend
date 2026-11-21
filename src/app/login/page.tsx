"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { useAuth, homeForRole } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try { const t = await login({ email, password }); router.push(homeForRole(t.role)); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Login failed."); }
    finally { setLoading(false); }
  }
  return (
    <AuthShell panelTitle="Welcome back." panelText="Log in to see your doctors and visits." title="Welcome back">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Link href="/forgot-password" className="-mt-1 self-end text-[14px] font-bold text-primary">Forgot password?</Link>
        {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
        <Button type="submit" full size="lg" loading={loading}>Log in</Button>
      </form>
      <p className="text-center text-[14px] text-ink-muted">New here? <Link href="/register" className="font-extrabold text-primary">Create account</Link></p>
      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-muted"><Icon name="lock" className="text-[14px]" />Your health information is private. You choose what to share.</p>
    </AuthShell>
  );
}
