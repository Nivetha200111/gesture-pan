precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uFeedback;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFinger;
uniform float uStrength;
uniform float uPinch;
uniform float uSwipe;
uniform float uTransition;
uniform int uMode;
uniform float uMirror;
uniform vec2 uVideoResolution;
uniform float uPreviewMode;
uniform float uPreviewStrength;
uniform float uFeedbackMix;

// Region-based effects: up to 6 soft fields.
uniform vec4 uRegions[6];       // (centerX, centerY, radiusX, radiusY)
uniform float uRegionModes[6];  // effect mode id
uniform float uRegionAlphas[6]; // opacity
uniform int uRegionCount;

varying vec2 vUv;

vec2 coverUv(vec2 uv) {
  float canvasAspect = uResolution.x / max(uResolution.y, 1.0);
  float videoAspect = uVideoResolution.x / max(uVideoResolution.y, 1.0);
  vec2 outUv = uv;
  if (videoAspect > canvasAspect) {
    outUv.x = (uv.x - 0.5) * (canvasAspect / videoAspect) + 0.5;
  } else {
    outUv.y = (uv.y - 0.5) * (videoAspect / canvasAspect) + 0.5;
  }
  return clamp(outUv, vec2(0.001), vec2(0.999));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

vec3 thermal(vec3 c, float n) {
  float l = dot(c, vec3(.299, .587, .114)) + n * .25;
  return .55 + .5 * cos(6.28318 * (vec3(.05, .36, .66) + l * vec3(1.0, .78, .55)));
}

vec3 minecraftPalette(vec3 c) {
  float l = dot(c, vec3(.299, .587, .114));
  if (l < .18) return vec3(.13, .11, .10);
  if (l < .34) return vec3(.28, .24, .19);
  if (c.g > c.r * 1.08 && c.g > c.b * 1.05) return vec3(.22, .48, .18);
  if (c.r > c.g * 1.08) return vec3(.54, .34, .21);
  if (c.b > c.r * 1.08) return vec3(.28, .44, .58);
  if (l > .72) return vec3(.72, .70, .62);
  return vec3(.42, .38, .31);
}

vec3 edgeDetect(vec2 uv) {
  vec2 px = 1.0 / max(uVideoResolution, vec2(1.0));
  vec3 c = texture2D(uVideo, uv).rgb;
  vec3 r = texture2D(uVideo, uv + vec2(px.x, 0.0) * 2.0).rgb;
  vec3 d = texture2D(uVideo, uv + vec2(0.0, px.y) * 2.0).rgb;
  return vec3(length(c - r) + length(c - d));
}

// Apply a specific effect to a color based on mode
vec3 applyEffect(vec3 col, vec2 uv, float mode, float n) {
  // Infrared (mode 4)
  if (mode < 4.5 && mode > 3.5) {
    vec3 e = edgeDetect(uv);
    return vec3(.02, .16, .1) + e * vec3(.1, 1.0, .72) * 3.5 + col.ggg * vec3(.05, .6, .35);
  }
  // Heatmap (mode 3)
  if (mode < 3.5 && mode > 2.5) {
    return thermal(col, n);
  }
  // Matrix (mode 9)
  if (mode < 9.5 && mode > 8.5) {
    float scan = step(.96, fract(uv.y * 95.0 + uTime * 6.0));
    return col.ggg * vec3(.05, .8, .22) + scan * vec3(0.0, 1.0, .25);
  }
  // Glitch (mode 8)
  if (mode < 8.5 && mode > 7.5) {
    float tear = hash(vec2(floor(uv.y * 60.0 + uTime * 12.0), uTime * 8.0));
    vec2 offset = vec2(step(.96, tear) * .016, 0.0);
    return vec3(
      texture2D(uVideo, uv + offset).r,
      texture2D(uVideo, uv).g,
      texture2D(uVideo, uv - offset).b
    ) + hash(uv * uResolution + uTime) * .08;
  }
  // Minecraft block pass (mode 6)
  if (mode < 6.5 && mode > 5.5) {
    vec2 blocks = vec2(42.0, 24.0);
    vec2 cell = floor(uv * blocks);
    vec2 local = fract(uv * blocks);
    vec2 vuv = (cell + .5) / blocks;
    vec3 vc = texture2D(uVideo, vuv).rgb;
    vec3 block = minecraftPalette(vc);
    float bevel = smoothstep(.0, .11, min(min(local.x, local.y), min(1.0 - local.x, 1.0 - local.y)));
    float grain = hash(cell) * .12;
    float edge = 1.0 - bevel;
    return block * (.82 + bevel * .24 + grain) - edge * .16;
  }
  // Neon (mode 7)
  if (mode < 7.5 && mode > 6.5) {
    vec3 e = edgeDetect(uv);
    return col * .3 + e * vec3(.3, .8, 1.0) * 4.0;
  }
  return col;
}

// Glow color for each effect
vec3 regionGlow(float mode) {
  if (mode < 4.5 && mode > 3.5) return vec3(.1, 1.0, .7);   // Infrared: green
  if (mode < 3.5 && mode > 2.5) return vec3(1.0, .4, .1);    // Heatmap: orange
  if (mode < 9.5 && mode > 8.5) return vec3(.1, 1.0, .3);    // Matrix: green
  if (mode < 8.5 && mode > 7.5) return vec3(1.0, .2, .4);    // Glitch: red
  if (mode < 6.5 && mode > 5.5) return vec3(.45, .9, .25);    // Minecraft: grass green
  if (mode < 7.5 && mode > 6.5) return vec3(.3, .7, 1.0);    // Neon: cyan
  return vec3(1.0);
}

void main() {
  vec2 screenUv = vUv;
  vec2 uv = coverUv(screenUv);
  if (uMirror > .5) uv.x = 1.0 - uv.x;
  vec2 f = uFinger;

  // Base: clean camera with subtle warp around finger
  float d = distance(screenUv, f);
  float m = smoothstep(.4, 0.0, d) * uStrength * 0.5;
  vec2 dir = normalize(screenUv - f + 1e-4);
  vec2 wuv = uv + dir * sin(d * 40.0 - uTime * 4.0) * .004 * m;

  vec3 col = texture2D(uVideo, wuv).rgb;
  float n = noise(screenUv * uResolution * .5 + uTime * 12.0);

  // Live hand lens: makes the current story chapter visible before stamping a region.
  float preview = smoothstep(.38, .05, d) * uPreviewStrength;
  if (preview > .01) {
    vec3 previewed = applyEffect(col, wuv, uPreviewMode, n);
    float ring = smoothstep(.018, .0, abs(d - (.18 + uPinch * .08)));
    col = mix(col, previewed, preview);
    col += regionGlow(uPreviewMode) * ring * (.35 + uPreviewStrength * .55);
  }

  // Apply region-based effects
  for (int i = 0; i < 6; i++) {
    if (i >= uRegionCount) break;
    vec4 reg = uRegions[i];
    float mode = uRegionModes[i];
    float alpha = uRegionAlphas[i];

    vec2 p = (screenUv - reg.xy) / max(reg.zw, vec2(.001));
    float field = length(p);
    float organic = noise(screenUv * 7.0 + vec2(float(i) * 13.7, uTime * .06)) * .11;
    float mask = smoothstep(1.05 + organic, .34, field) * alpha;

    if (mask > 0.01) {
      vec3 effected = applyEffect(col, wuv, mode, n);
      col = mix(col, effected, mask);

      float edge = smoothstep(.12, .0, abs(field - .92)) * alpha;
      col += regionGlow(mode) * edge * .22;
    }
  }

  // TouchDesigner-style feedback TOP: subtle zoom, drift, and persistence.
  vec2 fbUv = screenUv;
  float flow = noise(screenUv * 3.0 + uTime * .12) - .5;
  vec2 tangent = normalize(vec2(-(screenUv.y - f.y), screenUv.x - f.x) + 1e-4);
  fbUv = (fbUv - .5) * (.996 - uPinch * .01) + .5;
  fbUv += tangent * flow * (.004 + uPreviewStrength * .014);
  fbUv += (f - .5) * (.002 + uPinch * .006);
  vec3 feedback = texture2D(uFeedback, clamp(fbUv, vec2(.001), vec2(.999))).rgb;
  float feedbackAmount = uFeedbackMix * (.22 + uPreviewStrength * .32 + uPinch * .18);
  col = mix(col, feedback * .965 + col * .12, clamp(feedbackAmount, 0.0, .68));
  col += pow(max(max(feedback.r, feedback.g), feedback.b), 2.0) * regionGlow(uPreviewMode) * .035;

  // Subtle film grain
  col += (hash(screenUv * uResolution + uTime) - .5) * .018;

  // Very soft vignette
  col *= .92 + .08 * smoothstep(.9, .3, distance(screenUv, vec2(.5)));

  gl_FragColor = vec4(col, 1.0);
}
