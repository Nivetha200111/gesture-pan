import type { EffectMode } from '../types';
import { MODES, MODE_LABELS } from '../types';
export function ModeCarousel({ mode, setMode }: { mode: EffectMode; setMode: (m: EffectMode) => void }) {
  return <div className="flex max-w-[92vw] gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
    {MODES.map(m => <button key={m} onClick={() => setMode(m)} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-wide transition active:scale-95 ${mode === m ? 'bg-white text-black shadow-[0_0_24px_rgba(255,255,255,.45)]' : 'glass text-white/82'}`}>{MODE_LABELS[m]}</button>)}
  </div>;
}
