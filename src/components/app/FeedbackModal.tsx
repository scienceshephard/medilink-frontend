"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Slider } from "@/components/ui/Slider";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";

interface FeedbackModalProps {
  consultationId: number;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function FeedbackModal({
  consultationId,
  open,
  onClose,
  onSubmitted,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(3);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClose() {
    // Reset state when closing
    setRating(3);
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
      setError(
        err instanceof ApiError ? err.message : "Could not submit feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Rate your consultation">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Icon
            name="check_circle"
            fill
            className="text-[48px] text-secondary"
          />
          <p className="text-body-lg font-semibold text-on-surface">
            Thanks — feedback recorded.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-label-md text-on-surface-variant">
              Satisfaction rating: <span className="text-primary font-semibold">{rating}/5</span>
            </p>
            <Slider
              value={rating}
              min={1}
              max={5}
              step={1}
              onChange={setRating}
              labels={["Poor", "Fair", "Excellent"]}
            />
            <div className="mt-2 flex justify-between px-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={
                    n <= rating
                      ? "text-label-sm font-semibold text-primary"
                      : "text-label-sm text-on-surface-variant"
                  }
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          <Textarea
            label="Comments (optional)"
            placeholder="Share what went well or what could improve..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />

          {error && (
            <p className="rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Submit feedback
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
