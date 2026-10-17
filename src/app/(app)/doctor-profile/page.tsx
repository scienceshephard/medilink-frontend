"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { initials } from "@/lib/format";


export default function DoctorProfilePage() {
  const { data: doctor, loading, error, reload } = useApi(() => api.doctors.me(), []);
  const { data: specializations } = useApi(() => api.doctors.specializations(), []);
  const [specializationIds, setSpecializationIds] = useState<number[]>([]);
  const [serviceArea, setServiceArea] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [bio, setBio] = useState("");
  const [fee, setFee] = useState("");
  const [languages, setLanguages] = useState("English");
  const [licensingAuthority, setLicensingAuthority] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setClinicName(doctor.clinic_name ?? "");
    setClinicAddress(doctor.clinic_address ?? "");
    setServiceArea(doctor.location ?? "");
    setCoordinates(doctor.latitude != null && doctor.longitude != null
      ? { latitude: doctor.latitude, longitude: doctor.longitude }
      : null);
    setMeetingLink(doctor.default_meeting_link ?? "");
    setBio(doctor.bio ?? "");
    setFee(String(doctor.consultation_fee ?? 0));
    setLanguages((doctor.languages ?? ["English"]).join(", "));
    setLicensingAuthority(doctor.licensing_authority ?? "");
    setLicenseNumber(doctor.license_number ?? "");
    setLicenseExpiry(doctor.license_expiry?.slice(0, 10) ?? "");
    setSpecializationIds((specializations ?? []).filter((s) => doctor.specialization_names?.includes(s.name)).map((s) => s.id));
  }, [doctor, specializations]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.doctors.updateMe({
        location: serviceArea || undefined,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        clinic_name: clinicName || undefined,
        clinic_address: clinicAddress || undefined,
        default_meeting_link: meetingLink || undefined,
        specialization_ids: specializationIds,
        bio: bio || undefined,
        consultation_fee: fee ? Number(fee) : undefined,
        languages: languages.split(",").map((language) => language.trim()).filter(Boolean),
        licensing_authority: licensingAuthority || undefined,
        license_number: licenseNumber || undefined,
        license_expiry: licenseExpiry || undefined,
      });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function useCurrentLocation() {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: current }) => {
        setCoordinates({ latitude: current.latitude, longitude: current.longitude });
        setLocationMessage("Approximate location captured. Save your profile to update it.");
      },
      () => setLocationMessage("Location was not shared. You can allow it in browser settings and try again."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-[720px] rounded-[24px]" />;
  if (error || !doctor) return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error ?? "Could not load."}</p>;

  const missing = !doctor.clinic_address && !doctor.default_meeting_link && !doctor.location;

  return (
    <form onSubmit={handleSave} className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">My profile</h1>
        <Button type="submit" loading={saving}><Icon name="check" /> Save</Button>
      </div>

      {missing && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-5 py-4 font-bold text-warning">
          <Icon name="error" />
          Add a clinic address, video link, or service area depending on the visit types you want to offer.
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
        <h2 className="text-headline-md font-extrabold text-ink">License details</h2>
        <p className="text-caption text-ink-muted">An admin checks these details against the issuing authority. Updating license details sends an approved profile back for review.</p>
        <Input label="Licensing authority" value={licensingAuthority} onChange={(e) => setLicensingAuthority(e.target.value)} placeholder="Medical and Dental Council of Nigeria" />
        <Input label="License or registration number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
        <Input label="License expiry date" type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
        <h2 className="text-headline-md font-extrabold text-ink">Where you see patients</h2>
        <Input label="Service area (town or neighborhood)" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="Yaba, Lagos" />
        <p className="-mt-2 text-caption text-ink-muted">Used for area-aware recommendations and to show where you offer home visits. Do not put a patient’s address here.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={useCurrentLocation}>Set precise location</Button>
          {coordinates && <button type="button" onClick={() => { setCoordinates(null); setLocationMessage("Precise location will be removed when you save."); }} className="text-caption font-bold text-ink-muted underline">Remove precise location</button>}
          {locationMessage && <span role="status" className="text-caption text-ink-muted">{locationMessage}</span>}
        </div>
        <p className="-mt-2 text-caption text-ink-muted">Optional and private. Used to estimate straight-line distance to patients, not driving distance.</p>
        <Input label="Clinic name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Eze Heart Clinic" />
        <Input label="Clinic address (for clinic visits)" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} placeholder="12 Awolowo Road, Ikoyi, Lagos" />
        <Input label="Video call link (for video)" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="meet.google.com/abc-defg-hij" />
        <Input label="Price for one visit (₦)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
        <Input label="Languages you consult in" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Yoruba" />
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-5">
        <h2 className="text-headline-md font-extrabold text-ink">Your specialties</h2>
        <p className="text-caption text-ink-muted">Choose your main specialty first, then any additional specialties.</p>
        <div className="flex flex-wrap gap-2">
          {(specializations ?? []).map((specialty) => {
            const selected = specializationIds.includes(specialty.id);
            return <button key={specialty.id} type="button" aria-pressed={selected}
              onClick={() => setSpecializationIds((ids) => selected ? ids.filter((id) => id !== specialty.id) : [...ids, specialty.id])}
              className={`rounded-full border px-4 py-2 font-bold ${selected ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-muted"}`}>{specialty.name}</button>;
          })}
        </div>
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
