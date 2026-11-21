"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, AuthSubmit } from "@/components/app/AuthShell";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { useAuth, homeForRole } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

type Role = "patient" | "doctor";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [role, setRole] = useState<Role>("patient");
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Shared fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  // Doctor-only fields
  const [yearsExperience, setYearsExperience] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [licensingAuthority, setLicensingAuthority] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [doctorLanguages, setDoctorLanguages] = useState("English");
  const [consultationFee, setConsultationFee] = useState("");
  const [specializationIds, setSpecializationIds] = useState<number[]>([]);
  const [specializations, setSpecializations] = useState<{ id: number; name: string }[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (role === "doctor" && specializationIds.length === 0) {
      setError("Choose at least one specialty so patients can find you.");
      return;
    }
    if (role === "doctor" && (!licensingAuthority.trim() || !licenseNumber.trim() || !licenseExpiry)) {
      setError("Enter your licensing authority, license number and expiry date. An admin checks them before patients can book you.");
      return;
    }
    if (role === "doctor" && new Date(`${licenseExpiry}T23:59:59`) < new Date()) {
      setError("That license has already expired. Enter a current license.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let token;
      if (role === "patient") {
        token = await api.auth.registerPatient({
          full_name: fullName,
          email,
          password,
          location: location || null,
          phone: phone || null,
        });
      } else {
        token = await api.auth.registerDoctor({
          full_name: fullName,
          email,
          password,
          location: location || null,
          phone: phone || null,
          years_experience: Number(yearsExperience) || 0,
          qualifications: qualifications || null,
          licensing_authority: licensingAuthority.trim() || null,
          license_number: licenseNumber.trim() || null,
          license_expiry: licenseExpiry || null,
          bio: null,
          consultation_fee: Number(consultationFee) || 0,
          languages: doctorLanguages.split(",").map((language) => language.trim()).filter(Boolean),
          specialization_ids: specializationIds,
        });
      }
      setSession(token);
      router.push(homeForRole(token.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("role") === "doctor") setRole("doctor");
    api.doctors.specializations().then(setSpecializations).catch(() => setSpecializations([]));
  }, []);

  const doctorStep2 = role === "doctor" && step === 2;

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (role === "doctor") {
      setError(null);
      setStep(2);
      return;
    }
    void submit(e);
  }

  return (
    <AuthShell
      photo={doctorStep2 ? "clinic" : "video"}
      card={doctorStep2
        ? { title: "Checked before you go live", body: "An admin reviews every licence", icon: "verified_user" }
        : { title: "Your first visit, from home", body: "Video call · Pay only after a yes", icon: "videocam" }}
      topText="Already have an account?"
      topLink={{ label: "Log in", href: "/login" }}
      eyebrow={role === "doctor" ? (
        <span className="flex items-center gap-3">
          {doctorStep2 && <button type="button" onClick={() => setStep(1)} className="font-sans text-[14px] font-bold normal-case tracking-normal text-ink-muted hover:text-ink">← Back</button>}
          <span className="flex gap-1.5">{[1, 2].map((n) => <span key={n} className={cn("h-1 w-9 rounded-full", n <= step ? "bg-primary" : "bg-border")} />)}</span>
          Step {step} of 2
        </span>
      ) : "Create account"}
      title={doctorStep2 ? "Your practice." : "Let's get you seen."}
      subtitle={doctorStep2
        ? "An admin checks your licence with the issuing council before patients can book you."
        : "It takes a minute. You can add your health details later."}
      wide={doctorStep2}
    >
      {!doctorStep2 ? (
        <form onSubmit={next} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            {([["patient", "person", "I'm a patient", "I need care"], ["doctor", "stethoscope", "I'm a doctor", "I give care"]] as const).map(([value, icon, label, hint]) => {
              const on = role === value;
              return (
                <button key={value} type="button" role="radio" aria-checked={on} onClick={() => { setRole(value); setStep(1); }}
                  className={cn("flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors sm:px-4", on ? "border-2 border-primary bg-primary-soft" : "border-[#E3DCD0] bg-[#FBF9F5] hover:border-primary/50")}>
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", on ? "bg-primary text-white" : "bg-[#EFE8DD] text-ink")}><Icon name={icon} className="text-[20px]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold leading-tight sm:text-[16px]">{label}</span>
                    <span className="block text-[13px] text-ink-muted">{hint}</span>
                  </span>
                  <span className={cn("hidden h-5 w-5 shrink-0 rounded-full border-2 sm:block", on ? "border-[6px] border-primary" : "border-[#B9AFA3]")} />
                </button>
              );
            })}
          </div>
          <Input label="Full name" icon="person" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ada Obi" />
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Input label="Email" icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            <Input label="Phone" icon="call" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 …" />
          </div>
          <Input label="Password" icon="lock" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
          <Input label="Your area or town" icon="location_on" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="For example, Yaba, Lagos" />
          {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
          <AuthSubmit loading={loading}>{role === "doctor" ? "Continue" : "Create account"}</AuthSubmit>
          <p className="text-center font-mono text-[12px] text-ink-muted">By creating an account you agree to the Terms and Privacy policy.</p>
          <p className="text-center text-[14px] text-ink-muted">Running a clinic? <Link href="/register/clinic" className="font-extrabold text-primary">Register your practice</Link></p>
        </form>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label-md font-bold text-ink">Specialties</legend>
            <div className="flex flex-wrap gap-2">
              {specializations.length === 0 && <p className="text-[14px] text-ink-muted">Loading specialties…</p>}
              {specializations.map((specialty) => {
                const selected = specializationIds.includes(specialty.id);
                return (
                  <button key={specialty.id} type="button" aria-pressed={selected}
                    onClick={() => setSpecializationIds((ids) => selected ? ids.filter((id) => id !== specialty.id) : [...ids, specialty.id])}
                    className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-bold", selected ? "border-[1.5px] border-primary bg-primary-soft" : "border-[#E3DCD0] bg-[#FBF9F5]")}>
                    {selected && <Icon name="check" className="text-[14px] text-primary" />}{specialty.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Input required label="Licensing authority" icon="account_balance" value={licensingAuthority} onChange={(e) => setLicensingAuthority(e.target.value)} placeholder="Medical and Dental Council of Nigeria" />
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Input required label="Licence number" icon="badge" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Your registration number" />
            <Input required label="Licence expiry" type="date" min={new Date().toISOString().slice(0, 10)} value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Input label="Years of experience" icon="work_history" type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="10" />
            <Input label="Fee per visit (₦)" icon="payments" type="number" min={0} value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} placeholder="7500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Input label="Qualifications" icon="school" value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="MBBS, FMCP" />
            <Input label="Languages" icon="translate" value={doctorLanguages} onChange={(e) => setDoctorLanguages(e.target.value)} placeholder="English, Yoruba" />
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
          <AuthSubmit loading={loading}>Create doctor account</AuthSubmit>
        </form>
      )}
    </AuthShell>
  );
}
