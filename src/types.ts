export type EffectMode = 'liquid' | 'rainfall' | 'heatmap' | 'infrared' | 'sparkles' | 'voxel' | 'neon' | 'glitch' | 'matrix' | 'chaos';
export type GestureType = 'pan' | 'pinch' | 'swipe' | 'portal' | 'charge' | 'release' | 'kissy';
export type Vec2 = { x: number; y: number };
export type TrackedHand = {
  index: Vec2; thumb: Vec2; middle: Vec2; wrist: Vec2; palm: Vec2;
  velocity: Vec2; indexVelocity: Vec2; pinchDistance: number; pinchStrength: number; confidence: number;
};
export type FaceState = { mouth: Vec2; confidence: number; kissyScore: number; isKissy: boolean };
export type GestureFrame = {
  hands: TrackedHand[]; face: FaceState | null; pointer: TrackedHand | null; activeGesture: string;
  swipeVelocity: number; twoHandDistance: number; charge: number; demo: boolean; mirrored: boolean;
};
export type RendererStats = { fps: number; particles: number; quality: number };
export const MODES: EffectMode[] = ['liquid', 'rainfall', 'heatmap', 'infrared', 'sparkles', 'voxel', 'neon', 'glitch', 'matrix'];
export const MODE_LABELS: Record<EffectMode, string> = {
  liquid: 'Liquid Glass', rainfall: 'Rainfall', heatmap: 'Heatmap', infrared: 'Infrared',
  sparkles: 'Sparkle Magic', voxel: 'Voxel World', neon: 'Neon Portal', glitch: 'Glitch Pan',
  matrix: 'Matrix Rain', chaos: 'Chaos'
};
