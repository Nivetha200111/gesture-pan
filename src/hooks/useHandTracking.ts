import { useEffect, useRef, useState } from 'react';
import type { TrackedHand, Vec2 } from '../types';
import { dist, mirroredX, mix2 } from '../render/utils/math';

const smoothPoint = (prev: Vec2 | undefined, next: Vec2, speed = 0) => {
  if (!prev) return next;
  const alpha = Math.max(0.18, Math.min(0.48, 0.2 + speed * 4.5));
  return mix2(prev, next, alpha);
};

export function useHandTracking(video: React.RefObject<HTMLVideoElement | null>, enabled: boolean, mirrored: boolean) {
  const [hands, setHands] = useState<TrackedHand[]>([]); const smooth = useRef<TrackedHand[]>([]); const fail = useRef(false);
  useEffect(() => { if (!enabled || !video.current) return; let raf = 0, landmarker: any, cancelled = false;
    let lastVideoTs = 0;
    (async () => { try {
      const vision = await import('@mediapipe/tasks-vision'); const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      landmarker = await vision.HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .62, minHandPresenceConfidence: .62, minTrackingConfidence: .68 });
      const loop = () => { const v = video.current; if (!cancelled && v && v.readyState >= 2) {
          const timestamp = Math.max(lastVideoTs + 1, Math.round(v.currentTime * 1000)); lastVideoTs = timestamp;
          const res = landmarker.detectForVideo(v, timestamp); const next: TrackedHand[] = (res.landmarks ?? []).map((lm: any, i: number) => {
            const pt = (n: number): Vec2 => ({ x: mirroredX(lm[n].x, mirrored), y: lm[n].y }); const index = pt(8), thumb = pt(4), middle = pt(12), wrist = pt(0);
            const palm = { x: (pt(0).x + pt(5).x + pt(9).x + pt(13).x + pt(17).x) / 5, y: (pt(0).y + pt(5).y + pt(9).y + pt(13).y + pt(17).y) / 5 };
            const prev = smooth.current[i];
            const rawSpeed = prev ? dist(prev.index, index) : 0;
            const smIndex = smoothPoint(prev?.index, index, rawSpeed);
            const smPalm = smoothPoint(prev?.palm, palm, rawSpeed);
            const smThumb = smoothPoint(prev?.thumb, thumb, rawSpeed);
            const smMiddle = smoothPoint(prev?.middle, middle, rawSpeed);
            const smWrist = smoothPoint(prev?.wrist, wrist, rawSpeed);
            const pinchDistance = dist(smIndex, smThumb);
            const rawPinch = Math.max(0, Math.min(1, 1 - pinchDistance / .12));
            const pinchStrength = prev ? prev.pinchStrength + (rawPinch - prev.pinchStrength) * .28 : rawPinch;
            return { index: smIndex, thumb: smThumb, middle: smMiddle, wrist: smWrist, palm: smPalm, velocity: prev ? { x: smPalm.x - prev.palm.x, y: smPalm.y - prev.palm.y } : { x: 0, y: 0 }, indexVelocity: prev ? { x: smIndex.x - prev.index.x, y: smIndex.y - prev.index.y } : { x: 0, y: 0 }, pinchDistance, pinchStrength, confidence: .95 };
          }); smooth.current = next; setHands(next); }
        raf = requestAnimationFrame(loop); }; loop();
    } catch { fail.current = true; } })();
    return () => { cancelled = true; cancelAnimationFrame(raf); landmarker?.close?.(); };
  }, [enabled, mirrored, video]);
  return { hands, failed: fail.current };
}
