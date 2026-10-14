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
    api.doctors.specializations().then(setSpecializations).catch(() => setSpecializations([]));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-gutter py-12">
      <Card className="w-full max-w-lg">
        <Brand className="mb-6" />
        <h1 className="text-headline-lg font-bold">Create your account</h1>

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

        <p className="mt-4 text-body-md text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
