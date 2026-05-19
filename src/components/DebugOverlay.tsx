import type { EffectMode, GestureFrame, RendererStats } from '../types';
export function DebugOverlay({ show, stats, frame, mode }: { show: boolean; stats: RendererStats; frame: GestureFrame; mode: EffectMode }) {
  if (!show) return null; const h = frame.hands[0];
  return <pre className="glass absolute left-3 top-20 z-40 max-w-[78vw] rounded-2xl p-3 text-[10px] leading-4 text-cyan-50">
{`FPS ${stats.fps.toFixed(0)}  Q ${stats.quality.toFixed(2)}
Effect ${mode}
Gesture ${frame.activeGesture}
Hands ${frame.hands.length}  Hand conf ${(h?.confidence ?? 0).toFixed(2)}
Face conf ${(frame.face?.confidence ?? 0).toFixed(2)}
Kissy ${(frame.face?.kissyScore ?? 0).toFixed(2)}
Pinch ${(h?.pinchDistance ?? 0).toFixed(3)}
Swipe ${frame.swipeVelocity.toFixed(2)}
Particles ${stats.particles}`}
  </pre>;
}
