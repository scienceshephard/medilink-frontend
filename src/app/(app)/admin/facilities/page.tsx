"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { AdminFacility } from "@/lib/types";

function splitItems(value: string) {
  return [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
}

export default function FacilityReviewPage() {
  const [query, setQuery] = useState("");
  const [facilities, setFacilities] = useState<AdminFacility[]>([]);
  const [selected, setSelected] = useState<AdminFacility | null>(null);
  const [services, setServices] = useState("");
  const [equipment, setEquipment] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.admin.facilities(term);
      setFacilities(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the facility directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(""); }, [load]);

  function selectFacility(facility: AdminFacility) {
    setSelected(facility);
    setServices(facility.services.join(", "));
    setEquipment(facility.equipment.join(", "));
    setEvidence(facility.capabilities_evidence ?? "");
    setMessage(null);
  }

  async function saveCapabilities(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.admin.verifyFacilityCapabilities(selected.id, {
        services: splitItems(services),
        equipment: splitItems(equipment),
        evidence,
      });
      setMessage("Facility services and equipment saved with verification evidence.");
      await load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save facility capabilities.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <header>
        <p className="text-caption font-extrabold uppercase tracking-wide text-primary">Facility directory</p>
        <h1 className="mt-1 text-headline-lg-mobile font-extrabold text-ink md:text-headline-lg">Review services and equipment</h1>
        <p className="mt-2 max-w-3xl text-body-md text-ink-muted">Imported facility records provide locations and facility types. Add services or equipment only after checking current evidence, such as an official facility source or direct verification.</p>
      </header>
      <div className="rounded-2xl border border-border bg-primary-soft p-4 text-caption leading-5 text-ink-muted"><Icon name="info" className="mr-2 text-primary" />A blank inventory means unknown. Do not treat it as proof that the facility lacks a service or piece of equipment.</div>
      {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-[#EAF3EE] px-4 py-3 font-bold text-[#286653]">{message}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1"><Input label="Search facility name" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, e.g. General Hospital" /></div>
        <button className="h-14 self-end rounded-full bg-primary px-6 font-extrabold text-on-primary"><Icon name="search" /> Search</button>
      </form>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-[18px] border border-border bg-warm-white" aria-label="Health facilities">
          {loading ? <p className="p-5 text-body-md text-ink-muted">Loading facilities…</p> : facilities.length ? <ul className="max-h-[680px] divide-y divide-border overflow-y-auto">
            {facilities.map((facility) => <li key={facility.id}><button type="button" onClick={() => selectFacility(facility)} className={`w-full p-4 text-left hover:bg-primary-soft ${selected?.id === facility.id ? "bg-primary-soft" : ""}`}><span className="flex items-start justify-between gap-3"><span className="font-extrabold text-ink">{facility.name}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${facility.capabilities_verified ? "bg-[#EAF3EE] text-[#286653]" : "bg-sand text-ink-muted"}`}>{facility.capabilities_verified ? "Capabilities reviewed" : "No capability data"}</span></span><span className="mt-1 block text-caption text-ink-muted">{facility.lga}, {facility.state} · {facility.facility_type ?? facility.facility_level ?? "Facility type unknown"}</span></button></li>)}
          </ul> : <p className="p-5 text-body-md text-ink-muted">No facilities found for this search.</p>}
        </section>
        <section className="rounded-[18px] border border-border bg-warm-white p-5">
          {!selected ? <p className="text-body-md text-ink-muted">Select a facility to review its capability information.</p> : <>
            <h2 className="text-headline-md font-extrabold text-ink">{selected.name}</h2>
            <p className="mt-1 text-caption text-ink-muted">{selected.lga}, {selected.state}{selected.ward ? ` · ${selected.ward}` : ""}</p>
            <form onSubmit={saveCapabilities} className="mt-5 flex flex-col gap-4">
              <label className="text-label-md font-bold text-ink">Verified services <textarea value={services} onChange={(event) => setServices(event.target.value)} placeholder="Separate items with commas" className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-warm-white p-4 text-body-md font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
              <label className="text-label-md font-bold text-ink">Verified equipment <textarea value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Separate items with commas" className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-warm-white p-4 text-body-md font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
              <label className="text-label-md font-bold text-ink">Evidence checked <textarea required minLength={10} maxLength={2000} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Record the source URL, document title, verification date, or facility contact" className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-warm-white p-4 text-body-md font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
              <p className="text-[11px] leading-5 text-ink-muted">Saving marks these details as administrator-reviewed and allows verified services to influence facility matching. Include a source and date in the evidence note.</p>
              <button disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-extrabold text-on-primary disabled:opacity-50"><Icon name="verified" />{saving ? "Saving…" : "Save reviewed capabilities"}</button>
            </form>
          </>}
        </section>
      </div>
    </main>
  );
}
