import { RoleGate } from "@/components/app/RoleGate";

/**
 * Doctor-only. The requests inbox shows other patients' symptom text, so a
 * patient rendering this page is a privacy concern even though every panel's
 * data comes from require_doctor-protected endpoints that would 403.
 */
export default function DoctorPortalLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow="doctor">{children}</RoleGate>;
}
