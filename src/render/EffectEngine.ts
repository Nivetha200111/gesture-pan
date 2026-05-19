import type { EffectMode, GestureFrame, GestureType, Vec2 } from '../types';
import { MODES } from '../types';
import { ParticleSystem } from './ParticleSystem';
import { LiquidGlassEffect, type VisualEffect } from './effects/liquidGlass';
import { RainfallEffect } from './effects/rainfall';
import { HeatmapEffect } from './effects/heatmap';
import { InfraredEffect } from './effects/infrared';
import { SparklesEffect } from './effects/sparkles';
import { VoxelEffect } from './effects/voxel';
import { NeonPortalEffect } from './effects/neonPortal';
import { GlitchPanEffect } from './effects/glitchPan';
import { MatrixRainEffect } from './effects/matrixRain';
import { ChaosEffect } from './effects/chaos';

export class EffectEngine {
  particles = new ParticleSystem();
  mode: EffectMode = 'liquid';
  chaosUntil = 0;
  private effects: Record<EffectMode, VisualEffect> = {
    liquid: new LiquidGlassEffect(), rainfall: new RainfallEffect(), heatmap: new HeatmapEffect(), infrared: new InfraredEffect(),
    sparkles: new SparklesEffect(), voxel: new VoxelEffect(), neon: new NeonPortalEffect(), glitch: new GlitchPanEffect(),
    matrix: new MatrixRainEffect(), chaos: new ChaosEffect()
  };
  get active() { return this.effects[this.mode]; }
  setMode(mode: EffectMode) { this.mode = mode; }
  next() { this.setMode(MODES[(MODES.indexOf(this.mode === 'chaos' ? 'liquid' : this.mode) + 1) % MODES.length]); }
  random() { this.setMode(MODES[(Math.random() * MODES.length) | 0]); }
  triggerChaos() { this.mode = 'chaos'; this.chaosUntil = performance.now() + 5000; }
  update(input: GestureFrame, dt: number) {
    if (this.mode === 'chaos' && performance.now() > this.chaosUntil) this.mode = 'liquid';
    this.active.update(input, dt, this.particles);
    const h = input.hands[0];
    if (h?.pinchStrength && h.pinchStrength > .72) this.triggerGesture('pinch', h.index);
    if (input.swipeVelocity > 1.8 && h) this.triggerGesture('swipe', h.index);
    if (input.demo && Math.random() < .04) this.active.triggerKissyBurst({ mouth: { x: .5, y: .42 } }, this.particles);
    this.particles.update(dt);
  }
  triggerGesture(type: GestureType, payload?: unknown) { this.active.triggerGesture(type, payload); }
  triggerKissyBurst(mouth: Vec2) { this.active.triggerKissyBurst({ mouth }, this.particles); }
}
