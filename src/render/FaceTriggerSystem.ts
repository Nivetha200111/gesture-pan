import type { FaceState, Vec2 } from '../types';
import { mix2 } from './utils/math';

export class FaceTriggerSystem {
  face: FaceState = { mouth: { x: .5, y: .45 }, confidence: 0, kissyScore: 0, isKissy: false };
  private lastKissy = 0;
  update(raw: FaceState | null, onKissy: (mouth: Vec2) => void) {
    if (!raw) { this.face.confidence *= .92; this.face.isKissy = false; return this.face; }
    this.face.mouth = mix2(this.face.mouth, raw.mouth, .28);
    this.face.confidence = raw.confidence;
    this.face.kissyScore = this.face.kissyScore * .78 + raw.kissyScore * .22;
    const now = performance.now();
    this.face.isKissy = this.face.confidence > .45 && this.face.kissyScore > .62;
    if (this.face.isKissy && now - this.lastKissy > 1500) { this.lastKissy = now; onKissy(this.face.mouth); }
    return this.face;
  }
  force(onKissy: (mouth: Vec2) => void) { this.lastKissy = performance.now(); onKissy(this.face.mouth); }
}
