"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/components/ui/cn";

interface FeedbackModalProps {
  consultationId: number;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function FeedbackModal({ consultationId, open, onClose, onSubmitted }: FeedbackModalProps) {
  const [rating, setRating] = useState(4);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClose() {
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
    <Modal open={open} onClose={handleClose} title="How was your visit?">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Icon name="check_circle" fill className="text-[48px] text-accent" />
          <p className="text-body-lg font-extrabold text-ink">Thank you!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="font-bold text-ink">Tap the stars</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Icon name="star" fill className={cn("text-[44px]", n <= rating ? "text-face-same" : "text-border")} />
              </button>
            ))}
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Anything you want to say? (not needed)"
            className="min-h-[80px] w-full rounded-2xl border border-border bg-sand p-4 text-body-md placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send"} <Icon name="send" />
          </button>
        </div>
      )}
    </Modal>
  );
}
