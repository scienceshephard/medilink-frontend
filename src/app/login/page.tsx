"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
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
    <main className="min-h-screen bg-[#FCFBF8] px-5 py-8 sm:px-8 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[26px] border border-[#E4E9E5] bg-white lg:min-h-[650px] lg:grid-cols-[.9fr_1.1fr]">
      <div className="flex items-center justify-center p-5 sm:p-10 lg:p-14">
      <div className="w-full max-w-[390px]">
        <Brand className="mb-9" />
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#65756F]">Welcome back</p>
        <h1 className="mt-2 font-serif text-[42px] leading-tight tracking-[-.04em] text-[#19352E]">Good to see you again.</h1>
        <p className="mt-2 text-[14px] text-[#65756F]">Sign in to continue your care conversation.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-label-md text-error">{error}</p>}
          <Button type="submit" full size="lg" loading={loading}>Sign in</Button>
        </form>
        <p className="mt-5 text-[13px] text-[#65756F]">New to MediLink? <Link href="/register" className="font-bold text-[#286653]">Create an account</Link></p>
        <p className="mt-8 flex items-center gap-2 border-t border-[#E4E9E5] pt-4 text-[11px] leading-5 text-[#65756F]"><span className="text-[#286653]"><Icon name="lock" /></span>Your health information is private. You choose what to share.</p>
      </div></div>
      <div className="relative hidden overflow-hidden bg-[#EAF3EE] lg:block">
        <div className="absolute inset-0 bg-cover bg-center" role="img" aria-label="A doctor listening to a patient" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1100&q=85')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#19352E]/75 via-[#19352E]/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-white/80">Care begins with being heard</p><p className="mt-3 max-w-[440px] font-serif text-[37px] leading-tight">A clinician will review your concern and confirm the right next step with you.</p></div>
      </div>
      </div>
    </main>
  );
}
