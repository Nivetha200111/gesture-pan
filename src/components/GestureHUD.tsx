import { Circle, Hand, MousePointer2, Square, Trash2 } from 'lucide-react';

const effectTrack = ['Infrared', 'Minecraft', 'Heatmap', 'Matrix', 'Neon Portal', 'Glitch'];

export function GestureHUD({ visible, gesture, hasHands, regionCount, nextEffect, recording, recordTime, onRecord, onClear, fps }: {
  visible: boolean;
  gesture: string;
  hasHands: boolean;
  regionCount: number;
  nextEffect: string;
  recording: boolean;
  recordTime: number;
  onRecord: () => void;
  onClear: () => void;
  fps: number;
}) {
  const isDrawing = gesture === 'pinch vortex' || gesture === 'charge';
  const showControls = visible || recording;
  const act = !hasHands ? 'Act 01' : isDrawing ? 'Act 02' : regionCount > 0 ? 'Act 03' : 'Act 01';
  const line = !hasHands
    ? 'Raise your hand. The camera becomes an infrared scanner.'
    : isDrawing
      ? `Carve a ${nextEffect} window into the room.`
      : regionCount > 0
        ? 'Stack realities. Every painted region keeps its own physics.'
        : `Move through the frame. Next portal: ${nextEffect}.`;

  return (
    <>
      <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-20 h-36 bg-gradient-to-t from-black/55 to-transparent transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`pointer-events-none fixed left-1/2 top-5 z-30 w-[min(92vw,760px)] -translate-x-1/2 text-center transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
        <div className="mx-auto flex max-w-full flex-col items-center gap-2 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase text-cyan-200/55">{act}</div>
          <div className="text-sm text-white/58">{line}</div>
          <div className="text-[10px] font-semibold uppercase text-white/24">camera TOP / mediapipe CHOP / feedback TOP / GLSL TOP</div>
          <div className="flex max-w-full flex-wrap justify-center gap-x-2 gap-y-1 pt-1">
            {effectTrack.map(label => (
              <span
                key={label}
                className={`text-[10px] font-semibold uppercase ${
                  label === nextEffect
                    ? 'text-cyan-100/80'
                    : 'text-white/22'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={`pointer-events-none fixed left-5 top-32 z-30 transition-all duration-500 sm:top-5 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
        <div className="font-mono text-[10px] uppercase tracking-normal text-white/25">{fps.toFixed(0)} fps</div>
        <div className="mt-2 flex items-center gap-2 text-xs text-white/35">
          <span className={`h-1.5 w-1.5 rounded-full ${hasHands ? 'bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.9)]' : 'bg-white/20'}`} />
          <span>{hasHands ? gesture : 'waiting for hand'}</span>
        </div>
        {isDrawing && <div className="mt-2 text-[11px] font-medium text-cyan-200/70">painting {nextEffect}</div>}
      </div>

      {!hasHands && !recording && (
        <div className="pointer-events-none fixed inset-0 z-10 grid place-items-center">
          <div className="flex items-center gap-6 text-white/35">
            <div className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              <span className="text-xs">show hand</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-4 w-4" />
              <span className="text-xs">pinch and drag to paint</span>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-5 right-5 z-30 flex items-center gap-2 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {regionCount > 0 && (
          <button
            onClick={onClear}
            className="hud-button text-white/45 hover:text-white/75"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{regionCount} region{regionCount > 1 ? 's' : ''}</span>
          </button>
        )}
        <button
          onClick={onRecord}
          className={`hud-button ${
            recording
              ? 'border-rose-400/35 bg-rose-500/15 text-rose-200 shadow-[0_0_28px_rgba(244,63,94,.25)]'
              : 'text-white/45 hover:text-white/75'
          }`}
        >
          {recording ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="font-mono tabular-nums">{recordTime}s</span>
            </>
          ) : (
            <>
              <Circle className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>record</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
