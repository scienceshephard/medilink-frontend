"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

/**
 * A ticking countdown to a deadline. Uncertainty is most of what makes waiting
 * unbearable — a deadline you can watch is tolerable.
 */
export function Countdown({
  deadline,
  onExpire,
}: {
  deadline: string | null | undefined;
  onExpire?: () => void;
}) {
  const [label, setLabel] = useState(() => formatCountdown(deadline));

  useEffect(() => {
    setLabel(formatCountdown(deadline));
    if (!deadline) return;

    const id = setInterval(() => {
      const next = formatCountdown(deadline);
      setLabel(next);
      if (!next) {
        clearInterval(id);
        onExpire?.();
      }
    }, 30_000);

    return () => clearInterval(id);
  }, [deadline, onExpire]);

  if (!label) return null;
  return <span className="font-semibold tabular-nums">{label}</span>;
}
