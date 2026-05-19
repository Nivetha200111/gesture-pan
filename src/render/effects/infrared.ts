import { LiquidGlassEffect } from './liquidGlass';
import type { GestureFrame, Vec2 } from '../../types'; import type { ParticleSystem } from '../ParticleSystem';
export class InfraredEffect extends LiquidGlassEffect { mode = 'infrared' as const; update(input: GestureFrame, dt: number, p: ParticleSystem) { super.update(input, dt, p); if (input.hands[0] && Math.random()<.35) p.emit(input.hands[0].index, 'infrared', 2, .45); } triggerKissyBurst(payload: { mouth: Vec2 }, p: ParticleSystem) { p.emit(payload.mouth, 'infrared', 80, 1.7); this.strength = 1.9; } }
