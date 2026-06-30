export function Loader({ label = "Analyzing your health…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <span className="h-20 w-20 animate-[spin_1s_linear_infinite] rounded-full border-4 border-surface-container-high border-t-primary" />
      <div className="text-center">
        <p className="text-headline-md font-semibold text-on-surface">{label}</p>
        <p className="text-body-md text-on-surface-variant">Our AI is matching you securely.</p>
      </div>
    </div>
  );
}
