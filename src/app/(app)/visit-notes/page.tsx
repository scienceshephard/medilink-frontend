"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";

export default function VisitNotesPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-[760px] rounded-[24px]" />}>
      <NotesContent />
    </Suspense>
  );
}

function NotesContent() {
  const params = useSearchParams();
  const router = useRouter();
  const consultId = Number(params.get("id"));
  const { data: consult, loading, error } = useApi(
    () => (consultId ? api.consultations.get(consultId) : Promise.resolve(null)),
    [consultId],
  );

  const [privateNotes, setPrivateNotes] = useState("");
  const [sharedSummary, setSharedSummary] = useState("");
  const [saving, setSaving] = useState<"save" | "done" | "noshow" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmNoShow, setConfirmNoShow] = useState(false);

  useEffect(() => {
    if (consult) setPrivateNotes(consult.clinical_notes ?? "");
  }, [consult]);

  async function act(status?: string) {
    setSaving(status === "completed" ? "done" : status === "no_show" ? "noshow" : "save");
    setErr(null);
    setMsg(null);
    try {
      await api.consultations.update(consultId, {
        ...(status ? { status } : {}),
        clinical_notes: privateNotes || undefined,
        patient_summary: sharedSummary || undefined,
      });
      setMsg(status === "completed" ? "Visit marked done." : status === "no_show" ? "Marked as no-show." : "Notes saved.");
      if (status) setTimeout(() => router.push("/doctor-portal"), 900);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(null);
      setConfirmNoShow(false);
    }
  }

  if (loading) return <Skeleton className="mx-auto h-96 max-w-[760px] rounded-[24px]" />;
  if (error || !consult) return <p className="mx-auto max-w-[760px] py-16 text-center text-ink-muted">{error ?? "Visit not found."}</p>;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">Visit notes</h1>
      <p className="mt-1 text-body-md text-ink-muted">
        {new Date(consult.scheduled_datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {consult.symptom_input && (
        <Card className="mt-5">
          <p className="text-body-sm font-bold text-ink-muted">Reported concern</p>
          <p className="mt-1 text-body-md text-ink">“{consult.symptom_input}”</p>
        </Card>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Icon name="lock" className="h-4 w-4 text-ink-muted" />
            <h2 className="font-extrabold text-ink">Private — only you see this</h2>
          </div>
          <Textarea
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            placeholder="BP, temperature, observations, red flags ruled out…"
            className="mt-3 min-h-[120px]"
          />
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Icon name="person" className="h-4 w-4 text-ink-muted" />
            <h2 className="font-extrabold text-ink">Summary the patient sees</h2>
          </div>
          <Textarea
            value={sharedSummary}
            onChange={(e) => setSharedSummary(e.target.value)}
            placeholder="Plain words — what it likely is and what to do next…"
            className="mt-3 min-h-[120px]"
          />
        </Card>
      </div>

      {err && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{err}</p>}
      {msg && <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{msg}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" loading={saving === "done"} onClick={() => act("completed")}>
          <Icon name="check_circle" className="h-5 w-5" /> Visit done
        </Button>
        <Button variant="outline" onClick={() => setConfirmNoShow(true)}>
          <Icon name="cancel" className="h-5 w-5" /> Patient didn&apos;t show
        </Button>
        <Button loading={saving === "save"} onClick={() => act()}>
          <Icon name="edit" className="h-5 w-5" /> Save notes
        </Button>
      </div>

      <Modal open={confirmNoShow} onClose={() => setConfirmNoShow(false)} title="Did the patient show up?">
        <p className="text-body-md text-ink-muted">
          If they didn&apos;t arrive within 15 minutes of the visit time, mark no-show. The slot is released and any payment is refunded.
        </p>
        <div className="mt-5 grid gap-2">
          <Button variant="secondary" full loading={saving === "noshow"} onClick={() => act("no_show")}>Mark no-show</Button>
          <Button variant="outline" full onClick={() => setConfirmNoShow(false)}>They came — back to notes</Button>
        </div>
      </Modal>
    </div>
  );
}
