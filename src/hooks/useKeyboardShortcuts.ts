import { useEffect } from 'react';
import type { EffectMode } from '../types';
import { MODES } from '../types';

export function useKeyboardShortcuts(actions: { setMode: (m: EffectMode)=>void; kissy:()=>void; chaos:()=>void; record:()=>void; hide:()=>void; debug:()=>void; }) {
  useEffect(() => { const on = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const n = Number(e.key); if (n >= 1 && n <= 9) actions.setMode(MODES[n - 1]); if (e.key.toLowerCase()==='k') actions.kissy(); if (e.key.toLowerCase()==='c') actions.chaos(); if (e.key.toLowerCase()==='r') actions.record(); if (e.key.toLowerCase()==='h') actions.hide(); if (e.key.toLowerCase()==='d') actions.debug();
    }; window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [actions]);
}
