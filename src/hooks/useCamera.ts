import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [mirrored, setMirrored] = useState(false);
  const cleanup = useCallback(() => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setReady(false); }, []);
  const start = useCallback(async () => {
    setError(''); cleanup();
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost) {
      setError('Camera needs HTTPS on phones and LAN URLs. Open this on localhost, or run the HTTPS dev server and use its network URL.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not expose camera access here. Use Chrome/Safari on HTTPS or localhost.');
      return;
    }
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1920 } }, audio: false },
      { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 1920 } }, audio: false },
      { video: true, audio: false },
    ];
    try {
      let stream: MediaStream | null = null;
      let lastError: unknown;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (!stream) throw lastError;
      const v = videoRef.current;
      if (!v) throw new Error('Video element is not ready yet.');
      streamRef.current = stream; v.srcObject = stream; v.playsInline = true; v.muted = true; await v.play();
      const facing = stream.getVideoTracks()[0]?.getSettings().facingMode; setMirrored(facing === 'user' || !facing); setReady(true);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') setError('Camera permission was denied. Allow camera access in the browser site settings, then tap Enter GestureVerse again.');
      else if (e instanceof DOMException && e.name === 'NotReadableError') setError('The camera is already in use by another app or tab. Close other camera apps, then retry.');
      else if (e instanceof DOMException && e.name === 'NotFoundError') setError('No camera device was found by the browser.');
      else setError('Camera unavailable in this browser context. Try localhost, HTTPS, or a different browser.');
    }
  }, [cleanup]);
  useEffect(() => cleanup, [cleanup]);
  return { videoRef, start, ready, error, mirrored, cleanup };
}
