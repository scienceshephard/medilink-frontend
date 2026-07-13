/**
 * Parse a datetime string from the backend.
 *
 * The API stores naive UTC and serialises it without an offset
 * ("2026-07-15T10:15:17"). JavaScript reads an offset-less date-time as LOCAL
 * time, which would shift every appointment — and every countdown — by the
 * viewer's UTC offset. Treat it as UTC unless it already says otherwise.
 */
export function parseServerDate(iso: string): Date {
  const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`);
}

export function formatNaira(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseServerDate(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseServerDate(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseServerDate(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusTone(
  status: string,
): "primary" | "secondary" | "tertiary" | "success" | "error" | "neutral" {
  switch (status) {
    case "scheduled":
      return "success"; // accepted AND paid — it's really happening
    case "completed":
      return "success";
    case "accepted":
      return "primary"; // waiting on payment
    case "requested":
      return "neutral"; // waiting on the doctor
    case "declined":
    case "expired":
    case "cancelled":
    case "no_show":
      return "error";
    default:
      return "neutral";
  }
}

/** Patients see "Confirmed", not "Scheduled" — the enum is our word, not theirs. */
export function statusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "Confirmed";
    case "requested":
      return "Awaiting doctor";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    case "no_show":
      return "No-show";
    default:
      return titleCase(status);
  }
}

export function severityTone(
  severity: string | null | undefined,
): "success" | "tertiary" | "error" | "neutral" {
  switch (severity) {
    case "severe":
      return "error";
    case "moderate":
      return "tertiary";
    case "mild":
      return "success";
    default:
      return "neutral";
  }
}

/** "1h 47m" / "12m" / "" once the deadline has passed. */
export function formatCountdown(deadlineIso: string | null | undefined): string {
  if (!deadlineIso) return "";
  const ms = parseServerDate(deadlineIso).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return "";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "usually replies in 3h" — empty for a doctor with no history yet. */
export function formatResponseTime(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "";
  if (minutes < 60) return `usually replies in ${Math.round(minutes)}m`;
  return `usually replies in ${Math.round(minutes / 60)}h`;
}

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
