import { RoleGate } from "@/components/app/RoleGate";

/**
 * Admin-only area.
 *
 * Without this, `(app)/layout.tsx` was the only gate, and it admits any
 * signed-in role — so a patient could navigate to /admin and render the entire
 * console. Its panels errored out on the backend's 403s, but the page was
 * visible, which is exactly the "my friend got into the admin page" report.
 *
 * This is a disclosure control, not the authorisation boundary. The boundary is
 * require_admin on the backend; see RoleGate's docstring for why a client-side
 * check is the most that is possible while the token lives in localStorage.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow="admin">{children}</RoleGate>;
}
