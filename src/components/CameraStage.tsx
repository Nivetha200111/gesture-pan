import { useEffect, useRef } from 'react';
import type React from 'react';

export function CameraStage({ videoRef, hostRef, onTap }: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hostRef: React.RefObject<HTMLDivElement | null>;
  onTap: (doubleTap: boolean) => void;
}) {
  const lastTap = useRef(0);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const tap = () => { const now = performance.now(); onTap(now - lastTap.current < 320); lastTap.current = now; };
    el.addEventListener('pointerup', tap);
    return () => el.removeEventListener('pointerup', tap);
  }, [hostRef, onTap]);

  return (
    <div ref={hostRef} className="fixed inset-0 touch-none bg-black">
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
        playsInline
        muted
        aria-hidden="true"
      />
    </div>
  );
}
