"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const DISTANCES = [5, 10, 25, 50];
const MODES = [
  { key: "home_visit" as const, icon: "home_health", title: "Come to me", sub: "A clinician visits you" },
  { key: "clinic" as const, icon: "local_hospital", title: "I'll travel", sub: "You go to a clinic" },
  { key: "video" as const, icon: "videocam", title: "Video call", sub: "Talk from home" },
];

export default function CareAreaPage() {
  const router = useRouter();
  const { data: me, loading } = useApi(() => api.patients.me(), []);
  const [area, setArea] = useState("");
  const [travelKm, setTravelKm] = useState(10);
  const [mode, setMode] = useState<"home_visit" | "clinic" | "video">("home_visit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) {
      setArea(me.location ?? "");
      setTravelKm(me.travel_km ?? 10);
      setMode(me.preferred_care_mode ?? "home_visit");
    }
  }, [me]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patients.updateMe({
        location: area || undefined,
        travel_km: travelKm,
        preferred_care_mode: mode,
        home_address: mode === "home_visit" ? area : undefined,
      });
      router.push("/find-care");
    } catch {
      setError("Could not save your care area. Try again.");
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-[760px] rounded-[24px]" />;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">Your care area</h1>
      <p className="mt-1 text-body-md text-ink-muted">
        Where should we look for care near you? You can change this later.
      </p>

      <Card className="mt-6">
        <label className="text-body-sm font-bold text-ink-muted">Your area</label>
        <div className="mt-2 flex items-center gap-2 rounded-[14px] border border-border bg-sand px-4 py-3">
          <Icon name="location_on" className="h-5 w-5 text-primary" />
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Surulere, Lagos"
            className="flex-1 bg-transparent text-body-md font-semibold outline-none"
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-extrabold text-ink">How far can you travel?</h2>
        <div className="mt-3 flex gap-2">
          {DISTANCES.map((d) => (
            <button
              key={d}
              onClick={() => setTravelKm(d)}
              className={`h-11 flex-1 rounded-[14px] text-body-md font-extrabold transition-colors ${
                travelKm === d ? "bg-primary text-on-primary" : "border border-border bg-warm-white text-ink"
              }`}
            >
              {d} km
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-extrabold text-ink">How do you want care?</h2>
        <div className="mt-3 space-y-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-colors ${
                mode === m.key ? "border-primary bg-primary-soft" : "border-border bg-warm-white"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-full ${mode === m.key ? "bg-primary text-on-primary" : "bg-accent-soft text-accent"}`}>
                <Icon name={m.icon} />
              </span>
              <span className="flex-1">
                <span className="block font-extrabold text-ink">{m.title}</span>
                <span className="block text-body-sm text-ink-muted">{m.sub}</span>
              </span>
              {mode === m.key && <Icon name="check_circle" className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
        <p className="mt-3 text-body-sm text-ink-muted">
          Home visits depend on clinician coverage in your area.
        </p>
      </Card>

      {error && <p className="mt-4 text-body-md text-ink-muted">{error}</p>}
      <Button full size="lg" loading={saving} onClick={save} className="mt-6">
        Save and find care
      </Button>
    </div>
  );
}
