import * as THREE from 'three';
import type { EffectMode, GestureFrame, RendererStats, Vec2 } from '../types';
import { MODE_LABELS } from '../types';
import { PerfMeter } from './utils/performance';
import { RegionTracker } from './RegionTracker';
import vertexShader from './shaders/base.vert?raw';
import fragmentShader from './shaders/camera.frag?raw';
import { clamp, mix2 } from './utils/math';

const modeId: Record<EffectMode, number> = { liquid: 1, heatmap: 3, infrared: 4, voxel: 6, neon: 7, glitch: 8, matrix: 9 };

export class GestureVerseRenderer {
  readonly regionTracker = new RegionTracker();
  readonly stats: RendererStats = { fps: 60, particles: 0, quality: 1 };
  readonly recordCanvas = document.createElement('canvas');
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private outputScene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material!: THREE.ShaderMaterial;
  private outputMaterial = new THREE.MeshBasicMaterial({ map: null });
  private texture?: THREE.VideoTexture;
  private feedbackA?: THREE.WebGLRenderTarget;
  private feedbackB?: THREE.WebGLRenderTarget;
  private readTarget?: THREE.WebGLRenderTarget;
  private writeTarget?: THREE.WebGLRenderTarget;
  private perf = new PerfMeter();
  private size = { w: 1920, h: 1080 };
  private finger: Vec2 = { x: .5, y: .5 };

  constructor(private host: HTMLElement, private video: HTMLVideoElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x020307, 1);
    this.renderer.domElement.className = 'absolute inset-0 h-full w-full';
    this.recordCanvas.width = 1920; this.recordCanvas.height = 1080;
    host.append(this.renderer.domElement);
    this.initScene();
    this.resize();
  }

  private initScene() {
    this.texture = new THREE.VideoTexture(this.video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const regionUniforms: Record<string, { value: unknown }> = {};
    const emptyRegions = new Array(6).fill(null).map(() => new THREE.Vector4(0, 0, 0, 0));
    const emptyFloats = new Array(6).fill(0);
    regionUniforms['uRegions'] = { value: emptyRegions };
    regionUniforms['uRegionModes'] = { value: emptyFloats };
    regionUniforms['uRegionAlphas'] = { value: emptyFloats };
    regionUniforms['uRegionCount'] = { value: 0 };

    this.material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: {
      uVideo: { value: this.texture }, uTime: { value: 0 },
      uFeedback: { value: null },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
      uVideoResolution: { value: new THREE.Vector2(1280, 720) },
      uFinger: { value: new THREE.Vector2(.5, .5) },
      uStrength: { value: .3 }, uPinch: { value: 0 }, uSwipe: { value: 0 },
      uPreviewMode: { value: 4 }, uPreviewStrength: { value: 0 }, uFeedbackMix: { value: .84 },
      uTransition: { value: 0 }, uMode: { value: 1 }, uMirror: { value: 0 },
      ...regionUniforms,
    } });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.outputScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outputMaterial));
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.size.w = Math.max(640, Math.floor(r.width * dpr));
    this.size.h = Math.max(360, Math.floor(r.height * dpr));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(r.width, r.height, false);
    this.material?.uniforms.uResolution.value.set(this.size.w, this.size.h);
    this.createFeedbackTargets();
  }

  private createFeedbackTargets() {
    if (!this.material) return;
    this.feedbackA?.dispose();
    this.feedbackB?.dispose();
    const options = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    this.feedbackA = new THREE.WebGLRenderTarget(this.size.w, this.size.h, options);
    this.feedbackB = new THREE.WebGLRenderTarget(this.size.w, this.size.h, options);
    this.feedbackA.texture.colorSpace = THREE.SRGBColorSpace;
    this.feedbackB.texture.colorSpace = THREE.SRGBColorSpace;
    this.readTarget = this.feedbackA;
    this.writeTarget = this.feedbackB;
    const previous = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.feedbackA);
    this.renderer.clear(true, true, true);
    this.renderer.setRenderTarget(this.feedbackB);
    this.renderer.clear(true, true, true);
    this.renderer.setRenderTarget(previous);
  }

  update(input: GestureFrame) {
    const dt = this.perf.tick();
    const h = input.hands[0];
    if (h) this.finger = mix2(this.finger, h.index, .4);

    // Update region tracker with pinch state
    const pinch = h?.pinchStrength ?? 0;
    this.regionTracker.update(pinch, this.finger);

    // Set uniforms
    this.material.uniforms.uTime.value = performance.now() / 1000;
    this.material.uniforms.uVideoResolution.value.set(this.video.videoWidth || 1280, this.video.videoHeight || 720);
    this.material.uniforms.uFinger.value.set(this.finger.x, this.finger.y);
    this.material.uniforms.uStrength.value = clamp(h ? .3 + pinch * .2 : 0, 0, 1);
    this.material.uniforms.uPinch.value = clamp(pinch, 0, 1);
    this.material.uniforms.uSwipe.value = clamp(input.swipeVelocity, 0, 2);
    const nextMode = this.regionTracker.getNextMode();
    this.material.uniforms.uPreviewMode.value = modeId[nextMode] ?? 4;
    this.material.uniforms.uPreviewStrength.value = h ? clamp(.18 + pinch * .48, 0, .72) : 0;
    this.material.uniforms.uFeedbackMix.value = h ? .86 : .74;
    this.material.uniforms.uMirror.value = input.mirrored ? 1 : 0;

    // Pass regions to shader
    const allRegions = this.regionTracker.getAllRegions();
    const regionVecs = this.material.uniforms.uRegions.value as THREE.Vector4[];
    const regionModes = this.material.uniforms.uRegionModes.value as number[];
    const regionAlphas = this.material.uniforms.uRegionAlphas.value as number[];

    for (let i = 0; i < 6; i++) {
      const r = allRegions[i];
      if (r) {
        regionVecs[i].set(r.center.x, r.center.y, r.radius.x, r.radius.y);
        regionModes[i] = modeId[r.mode] ?? 1;
        regionAlphas[i] = r.opacity;
      } else {
        regionVecs[i].set(0, 0, 0, 0);
        regionModes[i] = 0;
        regionAlphas[i] = 0;
      }
    }
    this.material.uniforms.uRegionCount.value = Math.min(6, allRegions.length);

    if (this.readTarget && this.writeTarget) {
      this.material.uniforms.uFeedback.value = this.readTarget.texture;
      this.renderer.setRenderTarget(this.writeTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.outputMaterial.map = this.writeTarget.texture;
      this.outputMaterial.needsUpdate = true;
      this.renderer.render(this.outputScene, this.camera);
      const lastRead = this.readTarget;
      this.readTarget = this.writeTarget;
      this.writeTarget = lastRead;
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.drawComposite();
    this.stats.fps = this.perf.fps;
    this.stats.quality = this.perf.quality;
    this.stats.particles = allRegions.length;
  }

  private drawComposite() {
    const rw = this.recordCanvas.width, rh = this.recordCanvas.height;
    const ctx = this.recordCanvas.getContext('2d')!;
    ctx.fillStyle = '#020307'; ctx.fillRect(0, 0, rw, rh);
    ctx.drawImage(this.renderer.domElement, 0, 0, rw, rh);
  }

  clearRegions() { this.regionTracker.clear(); }

  dispose() {
    this.texture?.dispose(); this.material.dispose(); this.outputMaterial.dispose(); this.feedbackA?.dispose(); this.feedbackB?.dispose(); this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
