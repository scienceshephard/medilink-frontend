"use client";
export function Slider({ value, min, max, step, onChange, labels }:
  { value: number; min: number; max: number; step: number; onChange: (n: number) => void; labels?: [string, string, string] }) {
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      {labels && (
        <div className="mt-2 flex justify-between text-label-md">
          <span className="text-secondary">{labels[0]}</span>
          <span className="text-on-surface-variant">{labels[1]}</span>
          <span className="text-error">{labels[2]}</span>
        </div>
      )}
    </div>
  );
}
