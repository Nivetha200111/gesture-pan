import { Sparkles } from 'lucide-react';

export function StartScreen({ onEnter, error }: { onEnter: () => void; error?: string }) {
  return <main className="relative grid h-full place-items-center overflow-hidden bg-[#030407] text-white">
    <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle at 50% 25%, rgba(68,220,255,.28), transparent 28%), radial-gradient(circle at 15% 80%, rgba(255,65,170,.2), transparent 28%), linear-gradient(180deg,#050711,#020307)' }} />
    <div className="absolute h-[64vmax] w-[64vmax] rounded-full border border-cyan-200/10" style={{ animation: 'spinSlow 22s linear infinite' }} />
    <section className="relative z-10 flex w-full max-w-sm flex-col items-center px-8 text-center">
      <Sparkles className="mb-5 h-9 w-9 text-cyan-200 drop-shadow-[0_0_22px_rgba(103,232,249,.9)]" />
      <h1 className="text-5xl font-black tracking-normal">GestureVerse</h1>
      <p className="mt-3 text-sm text-white/68">Move. Pinch. Pout. Bend reality.</p>
      <button onClick={onEnter} className="glass mt-9 w-full rounded-full px-6 py-4 text-base font-bold text-white transition active:scale-95">Enter GestureVerse</button>
      {error && <p className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-950/35 px-4 py-3 text-xs leading-5 text-rose-100">{error}</p>}
    </section>
  </main>;
}
