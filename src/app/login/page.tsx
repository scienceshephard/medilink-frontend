"use client";

import Link from "next/link";
import { AuthShell } from "@/components/app/AuthShell";
import { LoginForm } from "@/components/app/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      photo="home"
      card={{ title: "Dr. Ngozi Eze said yes", body: "Home visit · Today, 10:00 AM", icon: "check_circle" }}
      topText="New here?"
      topLink={{ label: "Create account", href: "/register" }}
      eyebrow="Welcome back"
      title="Good to see you again."
      subtitle="Log in to see your doctors, visits and messages."
    >
      <LoginForm note="Private · Licence-checked doctors · Pay after a yes" />
      <p className="text-[14px] text-ink-muted">Signing in for a clinic? <Link href="/login/clinic" className="font-extrabold text-primary">Clinic sign-in</Link></p>
    </AuthShell>
  );
}
