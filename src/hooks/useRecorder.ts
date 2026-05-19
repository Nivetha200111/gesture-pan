import { useCallback, useRef, useState } from 'react';

export function useRecorder(canvas: HTMLCanvasElement | null) {
  const [recording, setRecording] = useState(false); const [countdown, setCountdown] = useState(0); const [time, setTime] = useState(0);
  const media = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const timer = useRef<number | undefined>(undefined);
  const stop = useCallback(() => { media.current?.stop(); media.current = null; window.clearInterval(timer.current); setRecording(false); }, []);
  const start = useCallback(async () => { if (!canvas || recording) return; for (let i=3;i>0;i--) { setCountdown(i); await new Promise(r => setTimeout(r, 1000)); } setCountdown(0);
    chunks.current = []; const stream = canvas.captureStream(60); const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    rec.ondataavailable = e => e.data.size && chunks.current.push(e.data); rec.onstop = () => { const url = URL.createObjectURL(new Blob(chunks.current, { type: 'video/webm' })); const a = document.createElement('a'); a.href = url; a.download = `gestureverse-${Date.now()}.webm`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
    media.current = rec; setTime(0); setRecording(true); timer.current = window.setInterval(() => setTime(t => t + 1), 1000); rec.start(250);
  }, [canvas, recording]);
  return { recording, countdown, time, start, stop };
}
