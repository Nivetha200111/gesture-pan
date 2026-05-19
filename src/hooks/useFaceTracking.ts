import { useEffect, useRef, useState } from 'react';
import type { FaceState, Vec2 } from '../types';
import { mirroredX } from '../render/utils/math';

export function useFaceTracking(video: React.RefObject<HTMLVideoElement | null>, enabled: boolean, mirrored: boolean) {
  const [face, setFace] = useState<FaceState | null>(null); const failed = useRef(false);
  useEffect(() => { if (!enabled || !video.current) return; let raf = 0, landmarker: any, cancelled = false;
    (async () => { try {
      const vision = await import('@mediapipe/tasks-vision'); const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      landmarker = await vision.FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task', delegate: 'GPU' }, outputFaceBlendshapes: true, runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence: .45 });
      const loop = () => { const v = video.current; if (!cancelled && v && v.readyState >= 2) {
          const res = landmarker.detectForVideo(v, performance.now()); const lm = res.faceLandmarks?.[0];
          if (lm) { const p = (n: number): Vec2 => ({ x: mirroredX(lm[n].x, mirrored), y: lm[n].y }); const left = p(61), right = p(291), top = p(13), bot = p(14); const mouth = { x: (left.x + right.x + top.x + bot.x) / 4, y: (left.y + right.y + top.y + bot.y) / 4 };
            const width = Math.abs(right.x - left.x), height = Math.abs(bot.y - top.y); const ratioScore = Math.max(0, Math.min(1, 1 - width / Math.max(.01, height * 3.2)));
            const shapes = res.faceBlendshapes?.[0]?.categories ?? []; const puck = shapes.find((s: any) => /mouthPucker/i.test(s.categoryName))?.score ?? 0; const funnel = shapes.find((s: any) => /mouthFunnel/i.test(s.categoryName))?.score ?? 0;
            setFace({ mouth, confidence: .9, kissyScore: Math.max(ratioScore, puck, funnel), isKissy: Math.max(ratioScore, puck, funnel) > .62 }); } else setFace(null); }
        raf = requestAnimationFrame(loop); }; loop();
    } catch { failed.current = true; } })();
    return () => { cancelled = true; cancelAnimationFrame(raf); landmarker?.close?.(); };
  }, [enabled, mirrored, video]);
  return { face, failed: failed.current };
}
