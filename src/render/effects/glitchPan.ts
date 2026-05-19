import { LiquidGlassEffect } from './liquidGlass';
import type { GestureFrame, Vec2 } from '../../types'; import type { ParticleSystem } from '../ParticleSystem';
export class GlitchPanEffect extends LiquidGlassEffect { mode = 'glitch' as const; update(input: GestureFrame, dt: number, p: ParticleSystem) { super.update(input, dt, p); if (input.swipeVelocity>.7 && input.hands[0]) p.emit(input.hands[0].index, 'glitch', 14, 1.5); } triggerKissyBurst(payload: { mouth: Vec2 }, p: ParticleSystem) { p.emit(payload.mouth, 'glitch', 140, 2.5); this.strength = 2.3; } }
