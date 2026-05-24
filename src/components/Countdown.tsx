export function Countdown({ value }: { value: number }) {
  if (!value) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <span className="text-[20vw] font-black text-white drop-shadow-[0_0_60px_rgba(255,255,255,.6)]">{value}</span>
    </div>
  );
}
