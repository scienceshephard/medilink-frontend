"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { MapPreview } from "@/components/ui/MapPreview";
import { getCurrentPosition, reverseGeocode } from "@/lib/geo";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PatientProfileUpdate } from "@/lib/types";
import { initials } from "@/lib/format";

function joinList(arr: string[] | undefined | null): string {
  return (arr ?? []).join(", ");
}
function splitList(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function ProfilePage() {
  const { data: patient, loading, error, reload } = useApi(() => api.patients.me(), []);

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [preferredLanguages, setPreferredLanguages] = useState("English");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [allergies, setAllergies] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setFullName(patient.full_name ?? "");
    setLocation(patient.location ?? "");
    setCoordinates(patient.latitude != null && patient.longitude != null
      ? { latitude: patient.latitude, longitude: patient.longitude }
      : null);
    setPhone(patient.phone ?? "");
    setPreferredLanguages((patient.preferred_languages ?? ["English"]).join(", "));
    setMedicalHistory(joinList(patient.medical_history));
    setChronicConditions(joinList(patient.chronic_conditions));
    setCurrentMedications(joinList(patient.current_medications));
    setAllergies(joinList(patient.allergies));
  }, [patient]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const payload: PatientProfileUpdate = {
      full_name: fullName.trim() || undefined,
      location: location.trim() || undefined,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      phone: phone.trim() || undefined,
      preferred_languages: splitList(preferredLanguages),
      medical_history: splitList(medicalHistory),
      chronic_conditions: splitList(chronicConditions),
      current_medications: splitList(currentMedications),
      allergies: splitList(allergies),
    };
    try {
      await api.patients.updateMe(payload);
      setSaveSuccess(true);
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function useCurrentLocation() {
    setLocationMessage("Finding your location…");
    try {
      const point = await getCurrentPosition();
      setCoordinates(point);
      const place = await reverseGeocode(point);
      if (place.area) setLocation(place.area);
      setLocationMessage(place.area
        ? `Location pinned near ${place.area}. Save your profile to use it for nearby matches.`
        : "Location pinned on the map. Save your profile to use it for nearby matches.");
    } catch (err) {
      setLocationMessage(err instanceof Error ? err.message : "Location was not shared.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-20 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
      </div>
    );
  }
  if (error) {
    return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error}</p>;
  }

  return (
    <form onSubmit={handleSave} className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">My profile</h1>
        <Button type="submit" loading={saving}>
          <Icon name="check" /> Save
        </Button>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4 rounded-[20px] border border-border bg-warm-white p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-soft text-headline-md font-extrabold text-accent">
          {initials(patient?.full_name ?? "")}
        </span>
        <div className="min-w-0">
          <p className="text-body-lg font-extrabold text-ink">{patient?.full_name}</p>
          <p className="text-body-md text-ink-muted">{patient?.email}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* About you */}
        <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
          <h2 className="text-headline-md font-extrabold text-ink">About you</h2>
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 …" type="tel" />
          <Input label="Where you live" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={useCurrentLocation}><Icon name="my_location" /> Use current location</Button>
            {coordinates && <button type="button" onClick={() => { setCoordinates(null); setLocationMessage("Precise location will be removed when you save."); }} className="text-caption font-bold text-ink-muted underline">Remove precise location</button>}
            {locationMessage && <span role="status" className="text-caption text-ink-muted">{locationMessage}</span>}
          </div>
          {coordinates && <MapPreview point={coordinates} />}
          <p className="-mt-2 text-caption text-ink-muted">Optional. Precise coordinates help sort nearby doctors and facilities by straight-line distance. They are shared only for matching and are not shown on your public profile.</p>
          <Input label="Languages you prefer" value={preferredLanguages} onChange={(e) => setPreferredLanguages(e.target.value)} placeholder="English, Yoruba" />
          <p className="text-caption text-ink-muted">Used to help rank doctors who speak your preferred languages. Separate languages with commas.</p>
        </section>

        {/* Your health */}
        <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
          <h2 className="text-headline-md font-extrabold text-ink">Your health</h2>
          <p className="text-caption text-ink-muted">Medicines and allergies are saved on your profile; they are not currently used to rank doctors.</p>
          <p className="flex items-center gap-1.5 text-caption font-bold text-accent">
            <Icon name="check_circle" className="text-[18px] text-accent" /> Past history and long-term conditions help guide clinician matching.
          </p>
          <Input
            label="Long-term illness"
            value={chronicConditions}
            onChange={(e) => setChronicConditions(e.target.value)}
            placeholder="e.g. High blood pressure, Asthma"
          />
          <Input
            label="Past medical history"
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            placeholder="e.g. Diabetes type 2"
          />
          <Input
            label="Medicines you take"
            value={currentMedications}
            onChange={(e) => setCurrentMedications(e.target.value)}
            placeholder="e.g. Metformin, Lisinopril"
          />
          <Input
            label="Things you are allergic to"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Shellfish"
          />
        </section>
      </div>

      {saveSuccess && (
        <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">
          <Icon name="check_circle" fill /> Profile saved.
        </p>
      )}
      {saveError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{saveError}</p>}
    </form>
  );
}
