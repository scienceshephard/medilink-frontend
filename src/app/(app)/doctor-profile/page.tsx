"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";

function initials(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function DoctorProfilePage() {
  const { data: doctor, loading, error, reload } = useApi(() => api.doctors.me(), []);
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [bio, setBio] = useState("");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setClinicName(doctor.clinic_name ?? "");
    setClinicAddress(doctor.clinic_address ?? "");
    setMeetingLink(doctor.default_meeting_link ?? "");
    setBio(doctor.bio ?? "");
    setFee(String(doctor.consultation_fee ?? 0));
  }, [doctor]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.doctors.updateMe({
        clinic_name: clinicName || undefined,
        clinic_address: clinicAddress || undefined,
        default_meeting_link: meetingLink || undefined,
        bio: bio || undefined,
        consultation_fee: fee ? Number(fee) : undefined,
      });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-[720px] rounded-[24px]" />;
  if (error || !doctor) return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error ?? "Could not load."}</p>;

  const missing = !doctor.clinic_address || !doctor.default_meeting_link;

  return (
    <form onSubmit={handleSave} className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">My profile</h1>
        <Button type="submit" loading={saving}><Icon name="check" /> Save</Button>
      </div>

      {missing && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-5 py-4 font-bold text-warning">
          <Icon name="error" />
          Add a clinic address for in-person visits, or a video link for video ones — then you can add free times.
        </p>
      )}

      <div className="flex items-center gap-4 rounded-[20px] border border-border bg-warm-white p-5">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-headline-md font-extrabold text-accent">{initials(doctor.full_name)}</span>
        <div>
          <p className="text-body-lg font-extrabold text-ink">{doctor.full_name}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-0.5 text-caption font-bold text-accent">
            <Icon name="verified" className="text-[15px]" /> {doctor.verification_status}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
        <h2 className="text-headline-md font-extrabold text-ink">Your clinic</h2>
        <Input label="Clinic name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Eze Heart Clinic" />
        <Input label="Clinic address (for in-person)" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} placeholder="12 Awolowo Road, Ikoyi, Lagos" />
        <Input label="Video call link (for video)" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="meet.google.com/abc-defg-hij" />
        <Input label="Price for one visit (₦)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-5">
        <h2 className="text-headline-md font-extrabold text-ink">About you</h2>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Heart doctor with 18 years of experience…" className="min-h-[120px] rounded-2xl border border-border bg-sand p-4 text-body-md text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </section>

      {saved && <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent"><Icon name="check_circle" fill /> Profile saved.</p>}
      {saveError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{saveError}</p>}
    </form>
  );
}
