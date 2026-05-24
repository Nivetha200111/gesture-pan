import type { EffectMode, EffectRegion, Vec2 } from '../types';
import { EFFECT_CYCLE } from '../types';

const MAX_REGIONS = 6;

export class RegionTracker {
  regions: EffectRegion[] = [];
  private dragging = false;
  private dragStart: Vec2 = { x: 0, y: 0 };
  private currentRegion: EffectRegion | null = null;
  private cycleIndex = 0;
  private pinchWasActive = false;
  private seedCounter = 1;

  update(pinchStrength: number, fingerPos: Vec2) {
    const isPinching = this.pinchWasActive ? pinchStrength > 0.38 : pinchStrength > 0.55;

    if (isPinching && !this.pinchWasActive) {
      // Pinch just started: begin a new region.
      this.dragging = true;
      this.dragStart = { ...fingerPos };
      const mode = EFFECT_CYCLE[this.cycleIndex % EFFECT_CYCLE.length];
      this.currentRegion = {
        center: { ...fingerPos },
        radius: { x: 0.12, y: 0.12 },
        mode,
        opacity: 0,
        seed: this.seedCounter++,
      };
    }

    if (isPinching && this.dragging && this.currentRegion) {
      // Dragging: expand a soft field around the gesture path.
      const dx = Math.abs(fingerPos.x - this.dragStart.x);
      const dy = Math.abs(fingerPos.y - this.dragStart.y);
      const targetCenter = {
        x: (this.dragStart.x + fingerPos.x) * 0.5,
        y: (this.dragStart.y + fingerPos.y) * 0.5,
      };
      const targetRadius = {
        x: Math.min(0.56, Math.max(0.13, dx * 0.78 + 0.12)),
        y: Math.min(0.56, Math.max(0.13, dy * 0.78 + 0.12)),
      };
      this.currentRegion.center = {
        x: this.currentRegion.center.x + (targetCenter.x - this.currentRegion.center.x) * 0.22,
        y: this.currentRegion.center.y + (targetCenter.y - this.currentRegion.center.y) * 0.22,
      };
      this.currentRegion.radius = {
        x: this.currentRegion.radius.x + (targetRadius.x - this.currentRegion.radius.x) * 0.18,
        y: this.currentRegion.radius.y + (targetRadius.y - this.currentRegion.radius.y) * 0.18,
      };
      this.currentRegion.opacity = Math.min(1, this.currentRegion.opacity + 0.055);
    }

    if (!isPinching && this.pinchWasActive && this.dragging) {
      // Pinch released: stamp the region if it is big enough.
      if (this.currentRegion) {
        if (this.currentRegion.radius.x > 0.1 || this.currentRegion.radius.y > 0.1) {
          this.currentRegion.opacity = 1;
          this.regions.push(this.currentRegion);
          if (this.regions.length > MAX_REGIONS) this.regions.shift();
          this.cycleIndex++;
        }
      }
      this.currentRegion = null;
      this.dragging = false;
    }

    this.pinchWasActive = isPinching;

    // Fade out old regions slowly.
    for (const r of this.regions) {
      r.opacity = Math.max(0, r.opacity - 0.0007);
    }
    this.regions = this.regions.filter(r => r.opacity > 0);
  }

  getAllRegions(): EffectRegion[] {
    const all = [...this.regions];
    if (this.currentRegion && this.dragging) all.push(this.currentRegion);
    return all;
  }

  getNextMode(): EffectMode {
    return EFFECT_CYCLE[this.cycleIndex % EFFECT_CYCLE.length];
  }

  clear() {
    this.regions = [];
    this.currentRegion = null;
    this.dragging = false;
  }
}
