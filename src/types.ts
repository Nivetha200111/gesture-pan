export type EffectMode = 'liquid' | 'infrared' | 'heatmap' | 'matrix' | 'glitch' | 'voxel' | 'neon';
export type GestureType = 'pan' | 'pinch' | 'swipe' | 'portal' | 'charge' | 'release' | 'kissy';
export type Vec2 = { x: number; y: number };
export type TrackedHand = {
  index: Vec2; thumb: Vec2; middle: Vec2; wrist: Vec2; palm: Vec2;
  velocity: Vec2; indexVelocity: Vec2; pinchDistance: number; pinchStrength: number; confidence: number;
};
export type FaceState = { mouth: Vec2; confidence: number; kissyScore: number; isKissy: boolean };

export type EffectRegion = {
  center: Vec2;
  radius: Vec2;
  mode: EffectMode;
  opacity: number;
  seed: number;
};

export type GestureFrame = {
  hands: TrackedHand[]; face: FaceState | null; pointer: TrackedHand | null; activeGesture: string;
  swipeVelocity: number; twoHandDistance: number; charge: number; demo: boolean; mirrored: boolean;
  suggestedMode: EffectMode | null;
};
export type RendererStats = { fps: number; particles: number; quality: number };

export const EFFECT_CYCLE: EffectMode[] = ['infrared', 'voxel', 'heatmap', 'matrix', 'neon', 'glitch'];

export const MODE_LABELS: Record<EffectMode, string> = {
  liquid: 'Liquid Glass', heatmap: 'Heatmap', infrared: 'Infrared',
  voxel: 'Minecraft', neon: 'Neon Portal', glitch: 'Glitch',
  matrix: 'Matrix',
};
