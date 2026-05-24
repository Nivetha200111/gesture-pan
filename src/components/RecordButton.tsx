import { Circle, Square } from 'lucide-react';

export function RecordButton({ recording, time, onClick }: { recording: boolean; time: number; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className={`grid h-12 w-12 place-items-center rounded-full transition-all active:scale-90 ${
          recording
            ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,.4)]'
            : 'bg-white/[.06] text-white/60 hover:bg-white/[.12] hover:text-white'
        }`}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        {recording
          ? <Square className="h-4 w-4 fill-current" />
          : <Circle className="h-5 w-5 fill-rose-500 text-rose-500" />}
      </button>
      {recording && <span className="text-[10px] font-mono tabular-nums text-rose-400/80">{time}s</span>}
    </div>
  );
}
