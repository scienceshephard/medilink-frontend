"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
    <main className="grid min-h-screen place-items-center px-gutter">
      <Card className="w-full max-w-md">
        <Brand className="mb-6" />
        <h1 className="text-headline-lg font-bold">Welcome back</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-label-md text-error">{error}</p>}
          <Button type="submit" full size="lg" loading={loading}>Log in</Button>
        </form>
        <p className="mt-4 text-body-md text-on-surface-variant">No account? <Link href="/register" className="font-semibold text-primary">Register</Link></p>
      </Card>
    </main>
  );
}
