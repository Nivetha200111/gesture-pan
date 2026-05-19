import type { EffectMode } from '../types';
import { MODE_LABELS } from '../types';
export function FloatingEffectLabel({ mode, gesture }: { mode: EffectMode; gesture: string }) {
  return <div className="glass pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full px-4 py-2 text-center">
    <div className="text-[11px] font-black uppercase tracking-[.22em] text-white">{MODE_LABELS[mode]}</div>
    <div className="text-[10px] text-cyan-100/70">{gesture}</div>
  </div>;
}
