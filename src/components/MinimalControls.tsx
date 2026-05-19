import { EyeOff, Eye, Dices, Zap } from 'lucide-react';
import type { EffectMode } from '../types';
import { ModeCarousel } from './ModeCarousel';
import { RecordButton } from './RecordButton';

export function MinimalControls(props: { visible: boolean; mode: EffectMode; setMode: (m: EffectMode)=>void; random:()=>void; chaos:()=>void; hidden:boolean; toggleHidden:()=>void; recording:boolean; time:number; record:()=>void; }) {
  if (!props.visible || props.hidden || props.recording) return null;
  return <div className="absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-4 px-3">
    <ModeCarousel mode={props.mode} setMode={props.setMode} />
    <div className="flex items-center gap-3">
      <button className="glass grid h-12 w-12 place-items-center rounded-full transition active:scale-90" onClick={props.random} aria-label="Randomize"><Dices className="h-5 w-5" /></button>
      <button className="glass grid h-12 w-12 place-items-center rounded-full text-fuchsia-100 transition active:scale-90" onClick={props.chaos} aria-label="Chaos"><Zap className="h-5 w-5 fill-current" /></button>
      <RecordButton recording={props.recording} time={props.time} onClick={props.record} />
      <button className="glass grid h-12 w-12 place-items-center rounded-full transition active:scale-90" onClick={props.toggleHidden} aria-label="Hide UI">{props.hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>
    </div>
  </div>;
}
