"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/components/ui/cn";

type Outcome = "better" | "same" | "worse";

interface FeedbackModalProps {
  consultationId: number;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  /** Pre-select an outcome when the patient already answered elsewhere (e.g. the Home card). */
  initialOutcome?: Outcome | null;
}

const OUTCOMES: [Outcome, string, string, string][] = [
  ["better", "sentiment_very_satisfied", "Better", "text-face-better"],
  ["same", "sentiment_neutral", "Same", "text-face-same"],
  ["worse", "sentiment_very_dissatisfied", "Worse", "text-face-worse"],
];

export function FeedbackModal({
  consultationId, open, onClose, onSubmitted, initialOutcome = null,
}: FeedbackModalProps) {
  // Starts unset on purpose. treatment_outcome is ML training data for the
  // recommender, so a pre-selected "better" would let a patient who just taps
  // Send teach the model a recovery that never happened.
  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome);
  const [rating, setRating] = useState(4);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The modal stays mounted (visibility is driven by `open`), so re-arm the
  // form each time it opens — otherwise a second review reuses the first one's
  // answers, and `initialOutcome` would never be picked up.
  useEffect(() => {
    if (!open) return;
    setOutcome(initialOutcome);
    setRating(4);
    setComments("");
    setError(null);
    setDone(false);
  }, [open, initialOutcome]);

  function handleClose() {
    setOutcome(initialOutcome);
    setRating(4);
    setComments("");
    setError(null);
    setDone(false);
    onClose();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.consultations.feedback({
        consultation_id: consultationId,
        satisfaction_rating: rating,
        treatment_outcome: outcome,
        free_text_comments: comments.trim() || null,
      });
      setDone(true);
      setTimeout(() => {
        onSubmitted();
        handleClose();
      }, 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="How are you now?">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Icon name="check_circle" fill className="text-[48px] text-accent" />
          <p className="text-body-lg font-extrabold text-ink">Thank you!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <p className="font-bold text-ink">Did you get better after your visit?</p>
            <div className="flex gap-2.5">
              {OUTCOMES.map(([val, icon, label, col]) => {
                const on = outcome === val;
                return (
                  <button
                    key={val}
                    onClick={() => setOutcome(val)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-4 transition-colors",
                      on ? "border-2 border-primary bg-primary-soft" : "border border-border bg-sand",
                    )}
                  >
                    <Icon name={icon} className={cn("text-[36px]", col)} />
                    <span className="font-bold text-ink">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-bold text-ink">How was the doctor?</p>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Icon name="star" fill className={cn("text-[40px]", n <= rating ? "text-face-same" : "text-border")} />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Anything you want to say? (not needed)"
            className="min-h-[72px] w-full rounded-2xl border border-border bg-sand p-4 text-body-md placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || outcome === null}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {submitting ? "Sending…" : outcome === null ? "Pick one above" : "Send"} <Icon name="send" />
          </button>
        </div>
      )}
    </Modal>
  );
}
