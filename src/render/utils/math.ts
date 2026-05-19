import type { Vec2 } from '../../types';
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const mix2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const speed = (v: Vec2) => Math.hypot(v.x, v.y);
export const mirroredX = (x: number, mirrored: boolean) => (mirrored ? 1 - x : x);
