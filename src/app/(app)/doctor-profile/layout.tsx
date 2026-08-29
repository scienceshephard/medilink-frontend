import { RoleGate } from "@/components/app/RoleGate";

/** Doctor-only: clinic address, meeting link and consultation fee. */
export default function DoctorProfileLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allow="doctor">{children}</RoleGate>;
}
