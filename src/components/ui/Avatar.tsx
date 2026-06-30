import { initials } from "@/lib/format";
const palette = ["#0058bc", "#006878", "#4c4aca", "#7a5900", "#8c4a00", "#0a7d3b"];
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  return (
    <span style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white">
      {initials(name) || "?"}
    </span>
  );
}
