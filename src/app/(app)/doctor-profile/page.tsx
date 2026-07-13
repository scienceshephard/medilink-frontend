"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";

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
      setSaveError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error || !doctor) {
    return (
      <p className="rounded-xl bg-error-container px-5 py-4 text-body-md text-on-error-container">
        {error ?? "Could not load your profile."}
      </p>
    );
  }

  const missingAddress = !doctor.clinic_address;
  const missingLink = !doctor.default_meeting_link;

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="text-headline-lg text-on-surface">My Profile</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Patients see this before they request you.
        </p>
      </header>

      {(missingAddress || missingLink) && (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-warning-container px-5 py-4 text-body-md text-on-warning-container">
          <Icon name="error" className="mt-0.5 text-[20px]" />
          <span>
            {missingAddress && missingLink
              ? "You can't offer any slots yet — add a clinic address for in-person visits, or a meeting link for video ones."
              : missingAddress
                ? "Add a clinic address before offering in-person slots. Patients need to know where to go."
                : "Add a meeting link before offering video slots."}
          </span>
        </p>
      )}

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={doctor.full_name} size={72} />
          <div>
            <p className="text-headline-md text-on-surface">{doctor.full_name}</p>
            <p className="text-body-md text-on-surface-variant">{doctor.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge tone={doctor.verification_status === "verified" ? "success" : "neutral"}>
                {doctor.verification_status}
              </StatusBadge>
              {doctor.avg_response_minutes != null && (
                <StatusBadge tone="secondary">
                  Replies in ~{Math.round(doctor.avg_response_minutes / 60)}h
                </StatusBadge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <h2 className="text-headline-md text-on-surface">Practice</h2>
            <p className="mt-1 text-caption text-on-surface-variant">
              The clinic address is copied onto each appointment when you accept it, so a
              patient always sees where they went — even if you move practice later.
            </p>
          </div>

          <Input
            label="Clinic name"
            placeholder="Eze Heart Clinic"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
          />
          <Input
            label="Clinic address"
            placeholder="12 Awolowo Road, Ikoyi, Lagos"
            value={clinicAddress}
            onChange={(e) => setClinicAddress(e.target.value)}
          />
          <Input
            label="Default meeting link (for video slots)"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
          <Input
            label="Consultation fee (₦)"
            type="number"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <Textarea
            label="About you"
            placeholder="Consultant cardiologist with 14 years of experience…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          {saveError && (
            <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
              {saveError}
            </p>
          )}
          {saved && (
            <p className="rounded-lg bg-success-container px-4 py-3 text-body-md text-on-success-container">
              Profile saved.
            </p>
          )}

          <Button type="submit" loading={saving} full>
            Save profile
          </Button>
        </form>
      </Card>
    </div>
  );
}
