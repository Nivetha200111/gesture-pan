import type { EffectMode, Vec2 } from '../types';
import { modeColor } from './utils/color';

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; kind: EffectMode | 'rain' | 'code'; spin: number; glyph: string };
const GLYPHS = '01アイウエオカキクケコ<>/#$%*{}[]';
export class ParticleSystem {
  private particles: P[] = []; private pool: P[] = []; count = 0;
  emit(pos: Vec2, mode: EffectMode, n = 18, power = 1) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; const s = (.15 + Math.random() * .75) * power;
      const p = this.pool.pop() ?? {} as P; Object.assign(p, { x: pos.x, y: pos.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .08, life: .7 + Math.random() * 1.2, max: 1.4, size: 2 + Math.random() * 9, kind: mode, spin: Math.random() * 6.28, glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0] }); this.particles.push(p); } }
  rain(n = 3) { for (let i = 0; i < n; i++) { const p = this.pool.pop() ?? {} as P; Object.assign(p, { x: Math.random(), y: -0.05, vx: -.08, vy: .8 + Math.random() * .8, life: 1.6, max: 1.6, size: 8 + Math.random() * 24, kind: 'rain', spin: 0, glyph: '' }); this.particles.push(p); } }
  update(dt: number) { const keep: P[] = []; for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .12 * dt; p.spin += dt * 4; if (p.life > 0 && p.x > -.2 && p.x < 1.2 && p.y < 1.25) keep.push(p); else this.pool.push(p); } this.particles = keep; this.count = keep.length; }
  draw(ctx: CanvasRenderingContext2D, w: number, h: number) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of this.particles) { const a = Math.max(0, p.life / p.max); const x = p.x * w, y = p.y * h; ctx.globalAlpha = Math.min(1, a);
      if (p.kind === 'rain') { ctx.strokeStyle = 'rgba(135,205,255,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.size * .45, y + p.size * 2.8); ctx.stroke(); continue; }
      if (p.kind === 'matrix' || p.kind === 'code') { ctx.fillStyle = '#45ff8f'; ctx.shadowColor = '#2cff75'; ctx.shadowBlur = 14; ctx.font = `${p.size * 2}px monospace`; ctx.fillText(p.glyph, x, y); continue; }
      if (p.kind === 'voxel') { ctx.translate(x, y); ctx.rotate(p.spin); ctx.fillStyle = `color-mix(in srgb, ${modeColor('voxel')} 80%, white)`; ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2); ctx.setTransform(1,0,0,1,0,0); continue; }
      ctx.fillStyle = modeColor(p.kind); ctx.shadowColor = modeColor(p.kind); ctx.shadowBlur = p.size * 2.5; ctx.beginPath(); ctx.arc(x, y, p.size * (p.kind === 'sparkles' ? .55 : .38), 0, Math.PI * 2); ctx.fill();
      if (p.kind === 'sparkles') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(x - p.size, y); ctx.lineTo(x + p.size, y); ctx.moveTo(x, y - p.size); ctx.lineTo(x, y + p.size); ctx.stroke(); } }
    ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}
