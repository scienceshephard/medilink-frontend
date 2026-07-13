import { parseServerDate } from "@/lib/format";

export function downloadIcs(opts: { title: string; start: string; end: string; description?: string }) {
  const fmt = (s: string) => parseServerDate(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const body = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",
    `DTSTART:${fmt(opts.start)}`,`DTEND:${fmt(opts.end)}`,`SUMMARY:${opts.title}`,
    `DESCRIPTION:${opts.description ?? ""}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a"); a.href = url; a.download = "telemed-appointment.ics"; a.click();
  URL.revokeObjectURL(url);
}
