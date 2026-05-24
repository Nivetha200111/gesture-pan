import { useEffect, useRef, useState } from 'react';
import type { TrackedHand } from '../types';
import { dist } from '../render/utils/math';

const makeHand = (x: number, y: number, px: number, py: number, pinch = 0): TrackedHand => ({
  index: { x, y }, thumb: { x: x - .04 + pinch * .03, y: y + .03 }, middle: { x: x + .035, y: y + .02 }, wrist: { x, y: y + .18 }, palm: { x, y: y + .08 },
  velocity: { x: x - px, y: y - py }, indexVelocity: { x: x - px, y: y - py }, pinchDistance: dist({ x, y }, { x: x - .04 + pinch * .03, y: y + .03 }), pinchStrength: pinch, confidence: .8
});
export function usePointerFallback(target: React.RefObject<HTMLElement | null>) {
  const [hand, setHand] = useState<TrackedHand | null>(null); const last = useRef({ x: .5, y: .5, pinch: 0, t: 0 });
  useEffect(() => { const el = target.current; if (!el) return;
    const norm = (e: PointerEvent | MouseEvent | Touch) => { const r = el.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
    const move = (e: PointerEvent) => { const p = norm(e); const drag = e.buttons ? .75 : .2; const x = last.current.x + (p.x - last.current.x) * .34; const y = last.current.y + (p.y - last.current.y) * .34; last.current.pinch = e.shiftKey || e.button === 2 ? .85 : Math.max(0, last.current.pinch * .96); setHand(makeHand(x, y, last.current.x, last.current.y, Math.max(last.current.pinch, drag * .25))); last.current.x = x; last.current.y = y; last.current.t = performance.now(); };
    const wheel = (e: WheelEvent) => { last.current.pinch = Math.max(0, Math.min(1, last.current.pinch + (e.deltaY < 0 ? .16 : -.16))); };
    const leave = () => setTimeout(() => { if (performance.now() - last.current.t > 900) setHand(null); }, 950);
    el.addEventListener('pointermove', move); el.addEventListener('pointerdown', move); el.addEventListener('wheel', wheel, { passive: true }); el.addEventListener('pointerleave', leave); el.addEventListener('contextmenu', e => e.preventDefault());
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', move); el.removeEventListener('wheel', wheel); el.removeEventListener('pointerleave', leave); };
  }, [target]);
  return hand;
}
