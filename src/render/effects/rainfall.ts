import { LiquidGlassEffect } from './liquidGlass';
import type { GestureFrame, Vec2 } from '../../types'; import type { ParticleSystem } from '../ParticleSystem';
export class RainfallEffect extends LiquidGlassEffect { mode = 'rainfall' as const; update(input: GestureFrame, dt: number, p: ParticleSystem) { super.update(input, dt, p); p.rain(input.swipeVelocity > 1 ? 12 : 5); if (input.hands[0]) p.emit(input.hands[0].index, 'rainfall', 2, .35); } triggerKissyBurst(payload: { mouth: Vec2 }, p: ParticleSystem) { p.emit(payload.mouth, 'rainfall', 90, 1.8); this.strength = 1.8; } }
