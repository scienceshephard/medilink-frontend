"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/ui/Loader";

type Role = "patient" | "doctor" | "admin";

/** Where to send someone who reached a route their role has no business on. */
const HOME_FOR: Record<string, string> = {
  patient: "/dashboard",
  doctor: "/doctor-portal",
  admin: "/admin",
};

/**
 * Route guard.
 *
 * `allow` omitted — any signed-in role (used by the authenticated shell).
 * `allow` given   — only those roles; anyone else goes to their own home.
 *
 * This previously checked only that *a* role existed, not which one, so any
 * signed-in patient could navigate to /admin and render the whole console. The
 * API calls behind it returned 403 so no data leaked, but the page and its
 * structure were visible — which is alarming to whoever stumbles on it.
 *
 * DELIBERATELY CLIENT-SIDE. The session token lives in localStorage, which a
 * Next.js middleware cannot read: middleware runs on the server and sees only
 * cookies and headers. This cannot become a server-side gate without first
 * moving the token into an httpOnly cookie.
 *
 * So this is an information-disclosure and UX control, NOT an authorisation
 * boundary — anyone can edit their own localStorage and re-render this
 * component. The real boundary is the backend's require_admin / require_doctor,
 * which never trusts what the browser claims about its role. Do not move an
 * authorisation decision in here.
 */
export function RoleGate({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Role | Role[];
}) {
  const { role, ready } = useAuth();
  const router = useRouter();

  // Normalised to a stable string so the effect below does not re-run on every
  // render just because a fresh array literal was passed in.
  const allowKey = useMemo(
    () => (allow === undefined ? "" : (Array.isArray(allow) ? allow : [allow]).join(",")),
    [allow],
  );

  const permitted = useMemo(() => {
    if (!allowKey) return true; // no restriction beyond being signed in
    if (!role) return false;
    return allowKey.split(",").includes(role);
  }, [allowKey, role]);

  useEffect(() => {
    if (!ready) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    if (!permitted) {
      router.replace(HOME_FOR[role] ?? "/login");
    }
  }, [ready, role, permitted, router]);

  if (!ready || !role) return <Loader label="Loading…" />;
  // Held behind a loader rather than rendered and then yanked away, so a
  // wrong-role visitor never sees the page at all.
  if (!permitted) return <Loader label="Redirecting…" />;
  return <>{children}</>;
}
