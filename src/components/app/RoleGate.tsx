"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/ui/Loader";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const { role, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !role) router.replace("/login"); }, [ready, role, router]);
  if (!ready || !role) return <Loader label="Loading…" />;
  return <>{children}</>;
}
