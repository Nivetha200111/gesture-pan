import { LiquidGlassEffect } from './liquidGlass';
import type { GestureFrame, Vec2 } from '../../types'; import type { ParticleSystem } from '../ParticleSystem';
export class HeatmapEffect extends LiquidGlassEffect { mode = 'heatmap' as const; update(input: GestureFrame, dt: number, p: ParticleSystem) { super.update(input, dt, p); if (input.hands[0]) p.emit(input.hands[0].index, 'heatmap', 3, .55 + input.hands[0].pinchStrength); } triggerKissyBurst(payload: { mouth: Vec2 }, p: ParticleSystem) { p.emit(payload.mouth, 'heatmap', 100, 2); this.strength = 2; } }
