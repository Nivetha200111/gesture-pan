import type { EffectMode, GestureFrame, RendererStats } from '../types';

export function DebugOverlay({ show, stats, frame, mode }: { show: boolean; stats: RendererStats; frame: GestureFrame; mode: EffectMode }) {
  if (!show) return null;
  const h = frame.hands[0];
  return (
    <pre className="fixed left-4 top-16 z-50 max-w-xs rounded-lg bg-black/60 p-3 font-mono text-[10px] leading-4 text-green-300/70 backdrop-blur-sm">
{`FPS ${stats.fps.toFixed(0)}  Q ${stats.quality.toFixed(2)}
Effect ${mode}
Gesture ${frame.activeGesture}
Hands ${frame.hands.length}  Conf ${(h?.confidence ?? 0).toFixed(2)}
Face ${(frame.face?.confidence ?? 0).toFixed(2)}  Kissy ${(frame.face?.kissyScore ?? 0).toFixed(2)}
Pinch ${(h?.pinchDistance ?? 0).toFixed(3)}  Swipe ${frame.swipeVelocity.toFixed(2)}
Particles ${stats.particles}`}
    </pre>
  );
}
