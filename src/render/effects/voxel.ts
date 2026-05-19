import { LiquidGlassEffect } from './liquidGlass';
import type { GestureFrame, Vec2 } from '../../types'; import type { ParticleSystem } from '../ParticleSystem';
export class VoxelEffect extends LiquidGlassEffect { mode = 'voxel' as const; update(input: GestureFrame, dt: number, p: ParticleSystem) { super.update(input, dt, p); if (input.hands[0] && (input.swipeVelocity>.5 || input.hands[0].pinchStrength>.35)) p.emit(input.hands[0].index, 'voxel', 7, 1.2); } triggerKissyBurst(payload: { mouth: Vec2 }, p: ParticleSystem) { p.emit(payload.mouth, 'voxel', 120, 2.1); this.strength = 2; } }
