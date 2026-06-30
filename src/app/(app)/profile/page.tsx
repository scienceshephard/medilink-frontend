"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { RingScore } from "@/components/ui/RingScore";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PatientProfileUpdate } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function joinList(arr: string[] | undefined | null): string {
  return (arr ?? []).join(", ");
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: patient, loading, error, reload } = useApi(
    () => api.patients.me(),
    [],
  );

  // Form state
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [allergies, setAllergies] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Prefill form when data loads
  useEffect(() => {
    if (!patient) return;
    setFullName(patient.full_name ?? "");
    setLocation(patient.location ?? "");
    setPhone(patient.phone ?? "");
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
      phone: phone.trim() || undefined,
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
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <header className="mb-8">
          <Skeleton className="mb-2 h-10 w-56" />
          <Skeleton className="h-5 w-80" />
        </header>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-error-container bg-error-container px-5 py-4 text-body-md text-on-error-container">
        {error}
      </p>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  const completion = patient?.profile_completion_score ?? 0;

  return (
    <>
      {/* Page header */}
      <header className="mb-8">
        <h1 className="text-headline-lg-mobile md:text-headline-lg mb-1 text-on-surface">
          My Profile
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Keep your health information up to date for better recommendations.
        </p>
      </header>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left column: Completion card ── */}
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col items-center gap-4 text-center">
              {patient && <Avatar name={patient.full_name} size={72} />}
              <div>
                <p className="text-body-lg font-semibold text-on-surface">
                  {patient?.full_name}
                </p>
                <p className="text-label-md text-on-surface-variant">
                  {patient?.email}
                </p>
              </div>

              <RingScore value={completion} label="Profile" size={120} />

              <div className="w-full rounded-lg bg-surface-container-low px-4 py-3 text-left">
                <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
                  <Icon name="calendar_today" className="text-base" />
                  <span>
                    Member since {formatDate(patient?.created_at ?? null)}
                  </span>
                </div>
                {patient?.gender && (
                  <div className="mt-2 flex items-center gap-2 text-label-md text-on-surface-variant">
                    <Icon name="person" className="text-base" />
                    <span className="capitalize">{patient.gender}</span>
                  </div>
                )}
                {patient?.date_of_birth && (
                  <div className="mt-2 flex items-center gap-2 text-label-md text-on-surface-variant">
                    <Icon name="cake" className="text-base" />
                    <span>{formatDate(patient.date_of_birth)}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-label-md text-on-surface-variant">
                  <Icon name="medical_services" className="text-base" />
                  <span>{patient?.consultation_count ?? 0} consultations</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Right column: Editable sections ── */}
          <div className="flex flex-col gap-6 lg:col-span-2">

            {/* Personal info */}
            <Card>
              <div className="mb-5 flex items-center gap-2">
                <Icon name="person" className="text-primary" />
                <h2 className="text-headline-md text-on-surface">
                  Personal Information
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Full name"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <Input
                  label="Location"
                  placeholder="City, Country"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <Input
                  label="Phone"
                  placeholder="+234 000 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </div>
            </Card>

            {/* Medical information */}
            <Card>
              <div className="mb-5 flex items-center gap-2">
                <Icon name="medical_information" className="text-secondary" />
                <h2 className="text-headline-md text-on-surface">
                  Medical History
                </h2>
              </div>
              <p className="mb-4 text-body-md text-on-surface-variant">
                Enter multiple values separated by commas.
              </p>
              <div className="flex flex-col gap-4">
                <Input
                  label="Medical history"
                  placeholder="e.g. Hypertension, Diabetes type 2"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                />
                <Input
                  label="Chronic conditions"
                  placeholder="e.g. Asthma, Arthritis"
                  value={chronicConditions}
                  onChange={(e) => setChronicConditions(e.target.value)}
                />
              </div>
            </Card>

            {/* Medications & allergies */}
            <Card>
              <div className="mb-5 flex items-center gap-2">
                <Icon name="medication" className="text-tertiary" />
                <h2 className="text-headline-md text-on-surface">
                  Medications &amp; Allergies
                </h2>
              </div>
              <p className="mb-4 text-body-md text-on-surface-variant">
                Enter multiple values separated by commas.
              </p>
              <div className="flex flex-col gap-4">
                <Input
                  label="Current medications"
                  placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                />
                <div className="flex items-start gap-2">
                  <Icon
                    name="warning"
                    className="mt-9 shrink-0 text-base text-error"
                  />
                  <div className="flex-1">
                    <Input
                      label="Allergies"
                      placeholder="e.g. Penicillin, Shellfish, Pollen"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Save feedback */}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-label-md text-on-success-container">
                <Icon name="check_circle" fill className="text-base" />
                Profile updated successfully.
              </div>
            )}
            {saveError && (
              <p className="rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
                {saveError}
              </p>
            )}

            {/* Save button */}
            <div className="flex justify-end">
              <Button type="submit" loading={saving} size="lg">
                <Icon name="save" className="text-base" />
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
