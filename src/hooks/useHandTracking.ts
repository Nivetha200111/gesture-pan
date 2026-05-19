import { useEffect, useRef, useState } from 'react';
import type { TrackedHand, Vec2 } from '../types';
import { dist, mirroredX, mix2 } from '../render/utils/math';

export function useHandTracking(video: React.RefObject<HTMLVideoElement | null>, enabled: boolean, mirrored: boolean) {
  const [hands, setHands] = useState<TrackedHand[]>([]); const smooth = useRef<TrackedHand[]>([]); const fail = useRef(false);
  useEffect(() => { if (!enabled || !video.current) return; let raf = 0, landmarker: any, cancelled = false;
    (async () => { try {
      const vision = await import('@mediapipe/tasks-vision'); const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      landmarker = await vision.HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .45, minTrackingConfidence: .45 });
      const loop = () => { const v = video.current; if (!cancelled && v && v.readyState >= 2) {
          const res = landmarker.detectForVideo(v, performance.now()); const next: TrackedHand[] = (res.landmarks ?? []).map((lm: any, i: number) => {
            const pt = (n: number): Vec2 => ({ x: mirroredX(lm[n].x, mirrored), y: lm[n].y }); const index = pt(8), thumb = pt(4), middle = pt(12), wrist = pt(0);
            const palm = { x: (pt(0).x + pt(5).x + pt(9).x + pt(13).x + pt(17).x) / 5, y: (pt(0).y + pt(5).y + pt(9).y + pt(13).y + pt(17).y) / 5 };
            const prev = smooth.current[i]; const smIndex = prev ? mix2(prev.index, index, .32) : index; const smPalm = prev ? mix2(prev.palm, palm, .32) : palm; const pinchDistance = dist(index, thumb);
            return { index: smIndex, thumb, middle, wrist, palm: smPalm, velocity: prev ? { x: smPalm.x - prev.palm.x, y: smPalm.y - prev.palm.y } : { x: 0, y: 0 }, indexVelocity: prev ? { x: smIndex.x - prev.index.x, y: smIndex.y - prev.index.y } : { x: 0, y: 0 }, pinchDistance, pinchStrength: Math.max(0, Math.min(1, 1 - pinchDistance / .12)), confidence: .9 };
          }); smooth.current = next; setHands(next); }
        raf = requestAnimationFrame(loop); }; loop();
    } catch { fail.current = true; } })();
    return () => { cancelled = true; cancelAnimationFrame(raf); landmarker?.close?.(); };
  }, [enabled, mirrored, video]);
  return { hands, failed: fail.current };
}
