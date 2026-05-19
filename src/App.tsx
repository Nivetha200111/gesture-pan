import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EffectMode, GestureFrame } from './types';
import { StartScreen } from './components/StartScreen';
import { CameraStage } from './components/CameraStage';
import { FloatingEffectLabel } from './components/FloatingEffectLabel';
import { MinimalControls } from './components/MinimalControls';
import { Countdown } from './components/Countdown';
import { DebugOverlay } from './components/DebugOverlay';
import { useCamera } from './hooks/useCamera';
import { useHandTracking } from './hooks/useHandTracking';
import { useFaceTracking } from './hooks/useFaceTracking';
import { usePointerFallback } from './hooks/usePointerFallback';
import { useRecorder } from './hooks/useRecorder';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GestureVerseRenderer } from './render/GestureVerseRenderer';
import { composeGestureFrame } from './render/GestureInput';
import { FaceTriggerSystem } from './render/FaceTriggerSystem';

const blankFrame: GestureFrame = { hands: [], face: null, pointer: null, activeGesture: 'idle', swipeVelocity: 0, twoHandDistance: 0, charge: 0, demo: false, mirrored: false };
export default function App() {
  const camera = useCamera(); const hostRef = useRef<HTMLDivElement>(null); const renderer = useRef<GestureVerseRenderer | null>(null); const faceTriggers = useRef(new FaceTriggerSystem());
  const [entered, setEntered] = useState(false); const [mode, setModeState] = useState<EffectMode>('liquid'); const [ui, setUi] = useState(true); const [hideUi, setHideUi] = useState(false); const [debug, setDebug] = useState(false);
  const [frame, setFrame] = useState<GestureFrame>(blankFrame); const [recordCanvas, setRecordCanvas] = useState<HTMLCanvasElement | null>(null); const [stats, setStats] = useState({ fps: 60, particles: 0, quality: 1 });
  const hands = useHandTracking(camera.videoRef, camera.ready, camera.mirrored); const face = useFaceTracking(camera.videoRef, camera.ready, camera.mirrored); const pointer = usePointerFallback(hostRef);
  const recorder = useRecorder(recordCanvas); const lastHand = useRef(performance.now()); const autoModeAt = useRef(performance.now()); const uiTimer = useRef<number | undefined>(undefined);
  const setMode = useCallback((m: EffectMode) => { setModeState(m); renderer.current?.setMode(m); }, []);
  const kissy = useCallback(() => faceTriggers.current.force(m => renderer.current?.engine.triggerKissyBurst(m)), []);
  const chaos = useCallback(() => { renderer.current?.engine.triggerChaos(); setModeState('chaos'); }, []);
  const showUi = useCallback(() => { setUi(true); window.clearTimeout(uiTimer.current); uiTimer.current = window.setTimeout(() => setUi(false), 2200); }, []);
  const actions = useMemo(() => ({ setMode, kissy, chaos, record: () => recorder.recording ? recorder.stop() : recorder.start(), hide: () => setHideUi(v => !v), debug: () => setDebug(v => !v) }), [setMode, kissy, chaos, recorder]);
  useKeyboardShortcuts(actions);
  useEffect(() => { if (!entered || !camera.ready || !hostRef.current || !camera.videoRef.current || renderer.current) return;
    renderer.current = new GestureVerseRenderer(hostRef.current, camera.videoRef.current); setRecordCanvas(renderer.current.recordCanvas); const onResize = () => renderer.current?.resize(); window.addEventListener('resize', onResize); screen.orientation?.addEventListener?.('change', onResize);
    return () => { window.removeEventListener('resize', onResize); screen.orientation?.removeEventListener?.('change', onResize); renderer.current?.dispose(); renderer.current = null; };
  }, [entered, camera.ready, camera.videoRef]);
  useEffect(() => { if (!camera.ready) return; let raf = 0; const loop = () => { const rawFace = faceTriggers.current.update(face.face, m => renderer.current?.engine.triggerKissyBurst(m));
      if (hands.hands.length) lastHand.current = performance.now(); const demo = performance.now() - lastHand.current > 5000; if (demo && performance.now() - autoModeAt.current > 6000) { autoModeAt.current = performance.now(); renderer.current?.engine.next(); setModeState(renderer.current?.engine.mode ?? 'liquid'); }
      const next = composeGestureFrame(hands.hands, rawFace, pointer, camera.mirrored, demo); renderer.current?.update(next); setFrame(next); setStats({ ...(renderer.current?.stats ?? stats) }); raf = requestAnimationFrame(loop); }; loop(); return () => cancelAnimationFrame(raf);
  }, [camera.ready, camera.mirrored, face.face, hands.hands, pointer]);
  const enter = async () => { setEntered(true); await camera.start(); showUi(); };
  if (!entered || !camera.ready) return <StartScreen onEnter={enter} error={camera.error} />;
  return <main className="grid h-full place-items-center bg-[#020307] text-white" onPointerMove={showUi}>
    <section className="relative h-full max-h-[100svh] w-full max-w-[min(100vw,56.25vh)] overflow-hidden bg-black shadow-[0_0_80px_rgba(0,0,0,.8)]">
      <CameraStage videoRef={camera.videoRef} hostRef={hostRef} onTap={(doubleTap) => { showUi(); if (doubleTap) kissy(); }} />
      {!hideUi && !recorder.recording && <FloatingEffectLabel mode={mode} gesture={frame.activeGesture} />}
      <MinimalControls visible={ui} mode={mode} setMode={setMode} random={() => { renderer.current?.engine.random(); setModeState(renderer.current?.engine.mode ?? 'liquid'); }} chaos={chaos} hidden={hideUi} toggleHidden={() => setHideUi(v=>!v)} recording={recorder.recording} time={recorder.time} record={() => recorder.recording ? recorder.stop() : recorder.start()} />
      {hideUi && !recorder.recording && <button onClick={() => setHideUi(false)} className="glass absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-xs">Show UI</button>}
      <Countdown value={recorder.countdown} />
      <DebugOverlay show={debug} stats={stats} frame={frame} mode={mode} />
    </section>
  </main>;
}
