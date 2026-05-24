export class PerfMeter {
  fps = 60; quality = 1; private last = performance.now(); private frames = 0; private acc = 0;
  tick(now = performance.now()) {
    const dt = Math.min(.05, (now - this.last) / 1000 || .016);
    this.last = now; this.acc += dt; this.frames++;
    if (this.acc > .5) {
      this.fps = this.frames / this.acc;
      this.quality = this.fps < 24 ? .7 : this.fps < 35 ? .85 : 1;
      this.acc = 0; this.frames = 0;
    }
    return dt;
  }
}
