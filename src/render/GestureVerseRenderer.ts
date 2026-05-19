import * as THREE from 'three';
import type { EffectMode, GestureFrame, RendererStats, Vec2 } from '../types';
import { MODE_LABELS } from '../types';
import { PerfMeter } from './utils/performance';
import { EffectEngine } from './EffectEngine';
import vertexShader from './shaders/base.vert?raw';
import fragmentShader from './shaders/camera.frag?raw';
import { clamp, mix2 } from './utils/math';

const modeId: Record<EffectMode, number> = { liquid: 1, rainfall: 2, heatmap: 3, infrared: 4, sparkles: 5, voxel: 6, neon: 7, glitch: 8, matrix: 9, chaos: 10 };
export class GestureVerseRenderer {
  readonly engine = new EffectEngine();
  readonly stats: RendererStats = { fps: 60, particles: 0, quality: 1 };
  readonly overlay = document.createElement('canvas');
  readonly recordCanvas = document.createElement('canvas');
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene(); private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material!: THREE.ShaderMaterial; private texture?: THREE.VideoTexture; private perf = new PerfMeter();
  private size = { w: 720, h: 1280 }; private finger: Vec2 = { x: .5, y: .5 }; private transition = 0;
  constructor(private host: HTMLElement, private video: HTMLVideoElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x020307, 1); this.renderer.domElement.className = 'absolute inset-0 h-full w-full';
    this.overlay.className = 'pointer-events-none absolute inset-0 h-full w-full';
    this.recordCanvas.width = 720; this.recordCanvas.height = 1280;
    host.append(this.renderer.domElement, this.overlay); this.initScene(); this.resize();
  }
  private initScene() {
    this.texture = new THREE.VideoTexture(this.video); this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: {
      uVideo: { value: this.texture }, uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(720, 1280) },
      uFinger: { value: new THREE.Vector2(.5, .5) }, uStrength: { value: .55 }, uPinch: { value: 0 }, uSwipe: { value: 0 },
      uTransition: { value: 0 }, uMode: { value: 1 }, uMirror: { value: 0 }
    } });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }
  resize() {
    const r = this.host.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, this.perf.quality < .7 ? 1.25 : 2);
    this.size.w = Math.max(320, Math.floor(r.width * dpr)); this.size.h = Math.max(568, Math.floor(r.height * dpr));
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(r.width, r.height, false);
    this.overlay.width = this.size.w; this.overlay.height = this.size.h; this.material?.uniforms.uResolution.value.set(this.size.w, this.size.h);
    this.recordCanvas.width = 720; this.recordCanvas.height = 1280;
  }
  setMode(mode: EffectMode) { this.engine.setMode(mode); this.transition = 1; }
  update(input: GestureFrame) {
    const dt = this.perf.tick(); this.transition = Math.max(0, this.transition - dt * 2.8);
    const h = input.hands[0]; if (h) this.finger = mix2(this.finger, h.index, .34); else if (input.demo) this.finger = { x: .5 + Math.sin(performance.now()/650)*.28, y: .48 + Math.cos(performance.now()/830)*.22 };
    this.engine.update(input, dt); const pinch = h?.pinchStrength ?? (input.demo ? .5 + .5 * Math.sin(performance.now()/500) : 0);
    this.material.uniforms.uTime.value = performance.now() / 1000; this.material.uniforms.uFinger.value.set(this.finger.x, this.finger.y);
    this.material.uniforms.uStrength.value = clamp(.42 + this.engine.active.strength * .3 + input.charge * .5, 0, 2.5);
    this.material.uniforms.uPinch.value = clamp(pinch, 0, 1.5); this.material.uniforms.uSwipe.value = clamp(input.swipeVelocity, 0, 2.5);
    this.material.uniforms.uMode.value = modeId[this.engine.mode]; this.material.uniforms.uMirror.value = input.mirrored ? 1 : 0; this.material.uniforms.uTransition.value = this.transition;
    this.renderer.render(this.scene, this.camera); this.drawOverlay(); this.drawComposite();
    this.stats.fps = this.perf.fps; this.stats.quality = this.perf.quality; this.stats.particles = this.engine.particles.count;
  }
  private drawOverlay() {
    const ctx = this.overlay.getContext('2d')!; ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.engine.particles.draw(ctx, this.overlay.width, this.overlay.height);
    if (this.engine.mode === 'neon' || this.engine.mode === 'chaos') { ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(90,220,255,.8)'; ctx.shadowBlur=30; ctx.shadowColor='#7b5cff'; ctx.lineWidth=5; const r=80+Math.sin(performance.now()/140)*15; ctx.beginPath(); ctx.arc(this.finger.x*this.overlay.width,this.finger.y*this.overlay.height,r,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
    if (this.engine.mode === 'matrix' || this.engine.mode === 'chaos') { ctx.fillStyle='rgba(20,255,110,.2)'; ctx.font='18px monospace'; for(let i=0;i<26;i++) ctx.fillText('01ア<>', (i*47+performance.now()/12)%this.overlay.width, (i*91+performance.now()/5)%this.overlay.height); }
  }
  private drawComposite() {
    const ctx = this.recordCanvas.getContext('2d')!; ctx.fillStyle = '#020307'; ctx.fillRect(0,0,720,1280);
    ctx.drawImage(this.renderer.domElement, 0, 0, 720, 1280); ctx.drawImage(this.overlay, 0, 0, 720, 1280);
    ctx.fillStyle='rgba(255,255,255,.72)'; ctx.font='600 18px Inter, sans-serif'; ctx.fillText(MODE_LABELS[this.engine.mode], 28, 48);
  }
  dispose() { this.texture?.dispose(); this.material.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); this.overlay.remove(); }
}
