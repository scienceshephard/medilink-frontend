"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import type { Message } from "@/lib/types";

export default function ThreadPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-[760px] rounded-[24px]" />}>
      <ThreadContent />
    </Suspense>
  );
}

function ThreadContent() {
  const { role } = useAuth();
  const params = useSearchParams();
  const patientId = Number(params.get("patient_id"));
  const doctorId = Number(params.get("doctor_id"));
  const partnerName = params.get("name") ?? "Conversation";

  const partner = role === "doctor" ? { patient_id: patientId } : { doctor_id: doctorId };
  const { data: msgs, loading, reload } = useApi(() => api.messages.thread(partner), [patientId, doctorId]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api.messages.send({ body, ...partner });
      setDraft("");
      reload();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col" style={{ minHeight: "calc(100vh - 220px)" }}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon name={role === "doctor" ? "person" : "medical_services"} />
        </span>
        <div>
          <h1 className="font-extrabold text-ink">{partnerName}</h1>
          <p className="text-body-sm text-ink-muted">{role === "doctor" ? "Patient" : "Clinician"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-[20px] border border-border bg-warm-white p-4">
        {loading && <Skeleton className="h-40 rounded-[16px]" />}
        {msgs && msgs.length === 0 && (
          <p className="py-10 text-center text-body-md text-ink-muted">Say hello — no messages yet.</p>
        )}
        {msgs?.map((m: Message) => {
          const mine = m.sender_role === role;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  mine ? "bg-accent text-on-primary" : "border border-border bg-warm-white text-ink"
                }`}
              >
                <p className="text-body-md">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-on-primary/70" : "text-ink-muted"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          className="h-12 flex-1 rounded-full border border-border bg-sand px-5 text-body-md outline-none focus:border-primary"
        />
        <Button onClick={send} loading={sending} variant="secondary" className="h-12 w-12 !rounded-full !px-0">
          <Icon name="send" className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
