"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";

/** Admin action: create a one-hour password reset link to pass on to a user. */
export function ResetLinkButton({ role, id, name }: { role: "patient" | "doctor"; id: number; name: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create() {
    if (!window.confirm(`Create a password reset link for ${name}? Anyone with the link can set a new password for this account for the next hour, so send it only to them.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.admin.createResetLink(role, id);
      setLink(res.reset_link);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not create a link.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Copied. It works for 1 hour.");
    } catch {
      setMessage("Select the link and copy it.");
    }
  }

  if (link) {
    return (
      <div className="flex w-full flex-col gap-1.5 rounded-xl bg-surface-container-low p-2.5">
        <div className="flex items-center gap-2">
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={`Reset link for ${name}`} className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-caption text-ink" />
          <button type="button" onClick={copy} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-caption font-extrabold text-on-primary"><Icon name="content_copy" className="text-[14px]" />Copy</button>
        </div>
        {message && <p role="status" className="text-caption text-ink-muted">{message}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={create} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-caption font-bold text-ink-muted disabled:opacity-50">
        <Icon name="key" className="text-[14px]" />{busy ? "Creating…" : "Password reset link"}
      </button>
      {message && <p role="alert" className="text-caption text-error">{message}</p>}
    </div>
  );
}
