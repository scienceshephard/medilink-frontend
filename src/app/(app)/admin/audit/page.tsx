"use client";

import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export default function AdminAuditPage() {
  const audit = useApi(() => api.admin.auditLogs(50, 0), []);

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption font-extrabold uppercase tracking-wide text-primary">Administration</p>
          <h1 className="mt-1 text-headline-lg-mobile font-extrabold text-ink md:text-headline-lg">Audit history</h1>
          <p className="text-body-md text-ink-muted">A record of clinician verification and model retraining actions.</p>
        </div>
        <button onClick={audit.reload} className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-border px-4 font-bold text-primary"><Icon name="refresh" /> Refresh</button>
      </header>

      <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-4 text-body-md text-ink">
        <Icon name="info" className="text-primary" /> This log records admin actions only. It does not store patient symptom descriptions.
      </div>

      {audit.error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{audit.error}</p>}
      {audit.loading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 rounded-[18px]" />)}</div>
      ) : (audit.data?.items.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[20px] border border-border bg-warm-white px-6 py-12 text-center">
          <Icon name="history" className="text-[38px] text-primary" />
          <h2 className="text-headline-md font-extrabold text-ink">No admin actions recorded yet</h2>
          <p className="max-w-lg text-body-md text-ink-muted">New verification decisions and model retraining events will appear here.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-[20px] border border-border bg-warm-white" aria-label="Admin audit entries">
          <ul className="divide-y divide-border">
            {audit.data?.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-5">
                <div className="flex min-w-0 gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={entry.action.includes("verified") ? "verified_user" : entry.action.includes("retrained") ? "model_training" : "history"} /></span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink">{entry.summary}</p>
                    <p className="mt-0.5 text-caption text-ink-muted">{entry.action.replaceAll(".", " · ")} · {entry.target_type}{entry.target_id ? ` #${entry.target_id}` : ""}</p>
                    <p className="text-caption text-ink-muted">By {entry.actor}</p>
                  </div>
                </div>
                <time className="shrink-0 pl-[52px] text-caption text-ink-muted sm:pl-0" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-5 py-3 text-caption text-ink-muted">Showing {audit.data?.items.length ?? 0} of {audit.data?.total ?? 0} recent events</div>
        </section>
      )}
    </main>
  );
}
