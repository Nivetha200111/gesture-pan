import type { EffectMode, GestureFrame, GestureType, Vec2 } from '../../types';
import type { ParticleSystem } from '../ParticleSystem';
export interface VisualEffect { mode: EffectMode; strength: number; update(input: GestureFrame, dt: number, particles: ParticleSystem): void; triggerGesture(type: GestureType, payload?: unknown): void; triggerKissyBurst(payload: { mouth: Vec2 }, particles: ParticleSystem): void; }
export class LiquidGlassEffect implements VisualEffect {
  mode: EffectMode = 'liquid'; strength = .55;
  update(input: GestureFrame, dt: number, particles: ParticleSystem) { const h = input.hands[0]; this.strength += (((h?.pinchStrength ?? 0) + Math.min(input.swipeVelocity, 2) * .22) - this.strength) * dt * 4; if (h && Math.random() < .2) particles.emit(h.index, 'liquid', 1, .25); }
  triggerGesture() { this.strength = 1.35; }
  triggerKissyBurst(payload: { mouth: Vec2 }, particles: ParticleSystem) { particles.emit(payload.mouth, 'liquid', 70, 1.6); this.strength = 1.7; }
}
