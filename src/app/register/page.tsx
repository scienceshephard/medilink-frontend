"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth, homeForRole } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

type Role = "patient" | "doctor";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [role, setRole] = useState<Role>("patient");
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
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [specializationIds, setSpecializationIds] = useState<number[]>([]);
  const [specializations, setSpecializations] = useState<{ id: number; name: string }[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (role === "doctor" && specializationIds.length === 0) {
      setError("Choose at least one specialty so patients can find you.");
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
          bio: bio || null,
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

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-5 py-7 sm:px-8 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-[1200px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <Card className="w-full rounded-[24px] border-[#E4E9E5] p-5 shadow-none sm:p-8 lg:p-10">
        <Brand className="mb-7" />
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#65756F]">Get started</p>
        <h1 className="mt-1 font-serif text-[38px] leading-tight tracking-[-.04em] text-[#19352E]">Care begins with a conversation.</h1>
        <p className="mt-2 max-w-[540px] text-[14px] leading-6 text-[#65756F]">Choose the account that fits the way you’ll use MediLink.</p>

        {/* Role toggle */}
        <div className="mt-4 flex gap-3">
          <Chip active={role === "patient"} onClick={() => setRole("patient")}>
            Patient
          </Chip>
          <Chip active={role === "doctor"} onClick={() => setRole("doctor")}>
            Doctor
          </Chip>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            label="Full name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Jane Doe"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
          <Input
            label="Location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Lagos, NG"
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234 ..."
          />

          {role === "doctor" && (
            <>
              <fieldset className="space-y-2">
                <legend className="text-label-md font-semibold text-ink">Specialties</legend>
                <p className="text-caption text-ink-muted">Choose your main specialty and any others you practise.</p>
                <div className="flex flex-wrap gap-2">
                  {specializations.map((specialty) => {
                    const selected = specializationIds.includes(specialty.id);
                    return (
                      <button key={specialty.id} type="button" aria-pressed={selected}
                        onClick={() => setSpecializationIds((ids) => selected ? ids.filter((id) => id !== specialty.id) : [...ids, specialty.id])}
                        className={`rounded-full border px-4 py-2 font-bold ${selected ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-muted"}`}>
                        {specialty.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Input
                label="Years of experience"
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="10"
              />
              <Input label="Licensing authority" value={licensingAuthority} onChange={(e) => setLicensingAuthority(e.target.value)} placeholder="e.g. Medical and Dental Council of Nigeria" />
              <Input label="License or registration number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Your registration number" />
              <Input label="License expiry date" type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
              <Input label="Languages you consult in" value={doctorLanguages} onChange={(e) => setDoctorLanguages(e.target.value)} placeholder="English, Yoruba" />
              <p className="text-caption text-ink-muted">Your profile remains pending until an admin checks these details against the issuing authority.</p>
              <Input
                label="Qualifications"
                type="text"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="MBBS, FMCP"
              />
              <Textarea
                label="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your clinical focus and approach..."
              />
              <Input
                label="Consultation fee (NGN)"
                type="number"
                min={0}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="7500"
              />
            </>
          )}

          {error && <p className="text-label-md text-error">{error}</p>}
          <Button type="submit" full size="lg" loading={loading}>
            Create {role} account
          </Button>
        </form>

        <p className="mt-5 text-[13px] text-[#65756F]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </p>
      </Card>
      <aside className="hidden flex-col gap-4 lg:flex lg:pt-4">
        <div className="overflow-hidden rounded-[22px] bg-[#EAF3EE]"><div className="h-[220px] bg-cover bg-center" role="img" aria-label="Clinician meeting a patient" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=85')" }} /><div className="p-5"><h2 className="font-serif text-[24px] text-[#19352E]">A thoughtful first step.</h2><p className="mt-2 text-[13px] leading-6 text-[#65756F]">Describe a concern, review clinicians near you, and continue the conversation at a pace that feels right.</p></div></div>
        <div className="rounded-[18px] border border-[#E4E9E5] bg-white p-5"><p className="font-serif text-[20px] text-[#19352E]">Your information stays private</p><p className="mt-2 text-[12px] leading-5 text-[#65756F]">You choose what to share and when. Your exact address is only requested for a home visit.</p></div>
      </aside>
      </div>
    </main>
  );
}
