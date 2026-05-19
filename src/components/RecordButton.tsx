import { Circle, Square } from 'lucide-react';
export function RecordButton({ recording, time, onClick }: { recording: boolean; time: number; onClick: () => void }) {
  return <button onClick={onClick} className={`glass grid h-14 w-14 place-items-center rounded-full transition active:scale-90 ${recording ? 'text-rose-300' : 'text-white'}`} aria-label="Record">
    {recording ? <><Square className="h-5 w-5 fill-current" /><span className="absolute mt-20 text-xs font-bold">{time}s</span></> : <Circle className="h-7 w-7 fill-rose-500 text-rose-500 drop-shadow-[0_0_14px_rgba(244,63,94,.9)]" />}
  </button>;
}
