import { useEffect, useRef } from 'react';

export function CameraStage({ videoRef, hostRef, onTap }: { videoRef: React.RefObject<HTMLVideoElement | null>; hostRef: React.RefObject<HTMLDivElement | null>; onTap: (doubleTap: boolean) => void }) {
  const lastTap = useRef(0);
  useEffect(() => { const el = hostRef.current; if (!el) return; const tap = () => { const now = performance.now(); onTap(now - lastTap.current < 320); lastTap.current = now; }; el.addEventListener('pointerup', tap); return () => el.removeEventListener('pointerup', tap); }, [hostRef, onTap]);
  return <div ref={hostRef} className="relative h-full w-full touch-none overflow-hidden bg-black">
    <video ref={videoRef} className="hidden" playsInline muted />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_58%,rgba(0,0,0,.44))]" />
  </div>;
}
