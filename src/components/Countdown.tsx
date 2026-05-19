export function Countdown({ value }: { value: number }) {
  if (!value) return null;
  return <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-black/20 text-[28vw] font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,.9)]">{value}</div>;
}
