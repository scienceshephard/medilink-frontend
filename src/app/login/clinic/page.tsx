"use client";

import { AuthShell } from "@/components/app/AuthShell";
import { LoginForm } from "@/components/app/LoginForm";

export default function ClinicLoginPage() {
  return (
    <AuthShell
      photo="clinic"
      card={{ title: "New care requests", body: "Assign them to your team", icon: "inbox" }}
      topText="New clinic?"
      topLink={{ label: "Register your practice", href: "/register/clinic" }}
      eyebrow="For clinics"
      title="Sign in to your clinic."
      subtitle="Requests, your team and coverage — in one place."
    >
      <LoginForm emailLabel="Work email" emailPlaceholder="admin@yourclinic.ng" submitLabel="Sign in" note="Only your team sees your clinic's requests" />
    </AuthShell>
  );
}
