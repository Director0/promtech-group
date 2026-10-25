/* =============================================================================
   scene.js — hero 3D: «Квартал живёт».
   A floating diorama of a residential quarter the company builds, as one
   living loop:
     • traffic with weight: cars follow each other (Intelligent Driver Model),
       brake with nose dive and brake lights, stop at a traffic light while
       pedestrians cross; a bus serves its stop
     • the hero event: a truck brings prefab modules to the site, a tower crane
       (with inertia and a swinging hook) lifts them onto the new house floor by
       floor; when the house is done its windows light up from the bottom, then
       it dissolves into a gold drawing and the next project starts
     • a compressed day: the sun moves, windows switch on one by one at dusk,
       street lamps and headlights glow at night
     • the camera never stops: a slow orbit with speed waves that leans towards
       the construction while it is active; tilt shift depth of field keeps the
       miniature in focus
   Interaction: hover a house to see which of our projects it is (click opens
   it), drag to turn the quarter, optional city sound (off by default).

   Direction follows the vizavi_motion skill (storyboard, continuous camera,
   weight and secondary motion, sound, iteration). Rendering follows
   CloudAI-X/threejs-skills (instancing, no allocations in the loop, capped
   pixel ratio, paused when off screen).
   ========================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const SITE = window.SITE_CONFIG || {};
const CFG = SITE.scene || {};
const canvas = document.getElementById("scene-canvas");
const hero = document.getElementById("home");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stillMode = /[?&]still/.test(location.search);
const isMobile = window.innerWidth < 760;

/* ---------- dimensions of the quarter (world units) ---------- */
const FLOOR_H = 0.36, CELL_W = 0.42;
const RING = 8.5, RING_R = 2.2, ROAD_HALF = 0.85, LANE = 0.42;
const PLAT = 11.6;
const SITE_X = 4.4, SITE_Z = 4.6, SITE_BASE = 0.1;
const CRANE_X = 2.5, CRANE_Z = 6.3, MAST_H = 4.6, HOOK_HIGH = 4.0;
const MOD_W = 1.6, MOD_H = 0.32, MOD_D = 0.8;
const START_MODS = 4, MAX_MODS = 12;                 // 2 floors → 6 floors
const CROSS_X = -3;                                   // pedestrian crossing on the south ring

/* ---------- helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// critically damped spring (Unity SmoothDamp) — gives every mechanism weight
function smoothDamp(cur, target, st, smoothTime, dt) {
  const omega = 2 / smoothTime, x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target, temp = (st.v + omega * change) * dt;
  st.v = (st.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}
function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

/* rounded rectangle as a closed loop of [x, z] points. Travel order is
   counter clockwise seen from above, so the right hand side is the outside. */
function roundedRect(hx, hz, r, seg = 10) {
  const pts = [];
  const corners = [[hx - r, hz - r, Math.PI / 2], [hx - r, -hz + r, 0], [-hx + r, -hz + r, -Math.PI / 2], [-hx + r, hz - r, -Math.PI]];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= seg; i++) { const a = a0 - (i / seg) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  }
  return pts;
}

/* a closed path resampled at even spacing: position / heading by distance */
class Lane {
  constructor(pts, step = 0.05) {
    const n = pts.length, seg = [];
    let L = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); L += l;
    }
    const N = Math.max(16, Math.round(L / step));
    this.L = L; this.N = N; this.step = L / N;
    this.x = new Float32Array(N); this.z = new Float32Array(N);
    let si = 0, acc = 0;
    for (let k = 0; k < N; k++) {
      const target = k * this.step;
      while (si < n - 1 && acc + seg[si] < target) { acc += seg[si]; si++; }
      const t = seg[si] > 0 ? (target - acc) / seg[si] : 0;
      const a = pts[si], b = pts[(si + 1) % n];
      this.x[k] = a[0] + (b[0] - a[0]) * t; this.z[k] = a[1] + (b[1] - a[1]) * t;
    }
    this.dx = new Float32Array(N); this.dz = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const p = (k - 1 + N) % N, q = (k + 1) % N;
      const dx = this.x[q] - this.x[p], dz = this.z[q] - this.z[p], l = Math.hypot(dx, dz) || 1;
      this.dx[k] = dx / l; this.dz[k] = dz / l;
    }
    this.cars = [];
  }
  wrap(s) { s %= this.L; return s < 0 ? s + this.L : s; }
  ahead(from, to) { return this.wrap(to - from); }
  sample(s, out) {
    const f = this.wrap(s) / this.step, i = Math.floor(f) % this.N, j = (i + 1) % this.N, t = f - Math.floor(f);
    out.x = this.x[i] + (this.x[j] - this.x[i]) * t;
    out.z = this.z[i] + (this.z[j] - this.z[i]) * t;
    out.dx = this.dx[i] + (this.dx[j] - this.dx[i]) * t;
    out.dz = this.dz[i] + (this.dz[j] - this.dz[i]) * t;
    return out;
  }
  nearest(px, pz) {
    let best = 0, bd = Infinity;
    for (let k = 0; k < this.N; k++) { const d = (this.x[k] - px) ** 2 + (this.z[k] - pz) ** 2; if (d < bd) { bd = d; best = k; } }
    return best * this.step;
  }
}

/* Intelligent Driver Model: smooth following, braking and starting */
function idm(v, v0, gap, dv) {
  const A = 1.4, B = 2.2, s0 = 0.28, T = 0.8;
  const ss = s0 + Math.max(0, v * T + (v * dv) / (2 * Math.sqrt(A * B)));
  const g = Math.max(gap, 0.01);
  return A * (1 - Math.pow(v / v0, 4) - (ss / g) * (ss / g));
}

/* ---------- facade textures: albedo + data (threshold, window, can light) ---------- */
function facadeTextures() {
  const S = 512, C = 16, P = S / C;
  const a = document.createElement("canvas"); a.width = a.height = S;
  const e = document.createElement("canvas"); e.width = e.height = S;
  const ga = a.getContext("2d"), ge = e.getContext("2d");
  ga.fillStyle = "#ffffff"; ga.fillRect(0, 0, S, S);
  ge.fillStyle = "rgb(255,0,0)"; ge.fillRect(0, 0, S, S);
  const rnd = mulberry32(77);
  for (let cy = 0; cy < C; cy++) {
    for (let cx = 0; cx < C; cx++) {
      const x = cx * P, y = cy * P;
      const wx = x + P * 0.18, wy = y + P * 0.22, ww = P * 0.64, wh = P * 0.52;
      ga.fillStyle = "#3a414c"; ga.fillRect(wx, wy, ww, wh);
      ga.fillStyle = "#5d6673"; ga.fillRect(wx, wy, ww, wh * 0.32);
      ga.fillStyle = "#d6d1c7"; ga.fillRect(wx - 1, wy + wh, ww + 2, P * 0.07);
      const th = Math.floor((0.05 + rnd() * 0.9) * 255), can = rnd() < 0.64 ? 255 : 0;
      ge.fillStyle = `rgb(${th},255,${can})`; ge.fillRect(wx, wy, ww, wh);
    }
    ga.fillStyle = "#e3ded4"; ga.fillRect(0, cy * P, S, 2);
  }
  const map = new THREE.CanvasTexture(a);
  map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  const em = new THREE.CanvasTexture(e);
  em.colorSpace = THREE.NoColorSpace; em.wrapS = em.wrapT = THREE.RepeatWrapping;
  return { map, em };
}

function radialTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- glow / particle shaders ---------- */
const GLOW_VERT = /* glsl */ `
  attribute float aDelay;
  uniform float uOn;
  uniform float uIntro;
  uniform float uPixel;
  uniform float uSize;
  varying float vA;
  void main() {
    float wave = smoothstep(aDelay, aDelay + 0.15, uIntro * 1.25);
    vA = uOn * wave;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPixel * (30.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float l = length(gl_PointCoord - 0.5);
    float a = vA * pow(max(1.0 - l * 2.0, 0.0), 2.0);
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const FOUNTAIN_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixel;
  varying float vA;
  void main() {
    float t = fract(uTime * 0.55 + aSeed);
    float ang = aSeed * 6.2831 * 13.0;
    float r = 0.08 + t * (0.45 + fract(aSeed * 7.3) * 0.25);
    vec3 p = vec3(cos(ang) * r, 0.2 + t * 1.5 - t * t * 1.55, sin(ang) * r);
    vA = (1.0 - t) * smoothstep(0.0, 0.08, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 1.8 * uPixel * (30.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FOUNTAIN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float l = length(gl_PointCoord - 0.5);
    if (l > 0.5) discard;
    gl_FragColor = vec4(uColor, vA * 0.75);
    #include <colorspace_fragment>
  }
`;
/* tilt shift: blur grows away from a horizontal focus band (miniature DOF) */
const TiltShift = {
  uniforms: { tDiffuse: { value: null }, uDelta: { value: new THREE.Vector2() }, uFocus: { value: 0.5 }, uBand: { value: 0.16 }, uAmount: { value: 2.4 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uDelta; uniform float uFocus; uniform float uBand; uniform float uAmount;
    varying vec2 vUv;
    void main() {
      float b = clamp(max(abs(vUv.y - uFocus) - uBand, 0.0) * uAmount, 0.0, 1.0);
      vec4 sum = vec4(0.0); float tw = 0.0;
      for (int i = -6; i <= 6; i++) {
        float w = exp(-float(i * i) / 18.0);
        sum += texture2D(tDiffuse, vUv + uDelta * float(i) * b) * w; tw += w;
      }
      gl_FragColor = sum / tw;
    }
  `
};

/* ---------- optional city sound (Web Audio, off by default) ---------- */
class CitySound {
  constructor() { this.ctx = null; this.on = false; this.chordT = 0; this.chord = 0; }
  build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(ctx.destination);
    // small hall
    const rev = ctx.createConvolver(), len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir; this.rev = ctx.createGain(); this.rev.gain.value = 0.35;
    this.rev.connect(rev); rev.connect(this.master);
    // noise source shared by traffic hum and effects
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; nd[i] = last * 3.2; }
    this.noiseBuf = nb;
    // pad: a slow chord progression (Am9 → Fmaj9 → G6 → Esus)
    this.chords = [[110, 164.81, 196, 246.94, 329.63], [87.31, 130.81, 174.61, 220, 329.63], [98, 146.83, 196, 246.94, 293.66], [82.41, 123.47, 164.81, 220, 329.63]];
    this.padLP = ctx.createBiquadFilter(); this.padLP.type = "lowpass"; this.padLP.frequency.value = 1200;
    const pad = ctx.createGain(); pad.gain.value = 0.9;
    this.padLP.connect(pad); pad.connect(this.master); pad.connect(this.rev);
    this.voices = this.chords[0].map((f, i) => {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o1.type = "triangle"; o2.type = "sine"; o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 7 + i;
      g.gain.value = 0.028; o1.connect(g); o2.connect(g); g.connect(this.padLP); o1.start(); o2.start();
      return [o1, o2];
    });
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 260; lfo.connect(lg); lg.connect(this.padLP.frequency); lfo.start();
    // traffic hum follows the cars
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 320; bp.Q.value = 0.6;
    this.traffic = ctx.createGain(); this.traffic.gain.value = 0;
    ns.connect(bp); bp.connect(this.traffic); this.traffic.connect(this.master); ns.start();
  }
  start() {
    if (!this.ctx) this.build();
    this.ctx.resume(); this.on = true;
    this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.5);
  }
  stop() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    setTimeout(() => { if (!this.on && this.ctx) this.ctx.suspend(); }, 1200);
  }
  update(dt, night, speed) {
    if (!this.on) return;
    const now = this.ctx.currentTime;
    this.chordT += dt;
    if (this.chordT > 8) {
      this.chordT = 0; this.chord = (this.chord + 1) % this.chords.length;
      this.voices.forEach((vv, i) => vv.forEach((o) => o.frequency.setTargetAtTime(this.chords[this.chord][i], now, 0.9)));
    }
    this.padLP.frequency.setTargetAtTime(lerp(1500, 650, night), now, 1.5);
    this.traffic.gain.setTargetAtTime(0.015 + speed * 0.03, now, 0.4);
  }
  env(node, peak, attack, decay) {
    const g = this.ctx.createGain(), now = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
    node.connect(g); g.connect(this.master); g.connect(this.rev);
    return now + attack + decay + 0.05;
  }
  chime(step) {
    if (!this.on) return;
    const notes = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    const f = notes[step % notes.length];
    [[f, "sine", 0.16], [f * 2, "triangle", 0.04]].forEach(([fr, type, pk]) => {
      const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = fr;
      const end = this.env(o, pk, 0.01, 2.2); o.start(); o.stop(end);
    });
  }
  noise(type, freq, peak, decay) {
    if (!this.on) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    s.connect(f); const end = this.env(f, peak, 0.01, decay); s.start(); s.stop(end);
  }
  thud() {
    if (!this.on) return;
    const o = this.ctx.createOscillator(), now = this.ctx.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(95, now); o.frequency.exponentialRampToValueAtTime(42, now + 0.25);
    const end = this.env(o, 0.35, 0.005, 0.4); o.start(); o.stop(end);
    this.noise("lowpass", 500, 0.12, 0.2);
  }
  clank() {
    if (!this.on) return;
    [330, 495].forEach((f) => { const o = this.ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f; const end = this.env(o, 0.05, 0.003, 0.18); o.start(); o.stop(end); });
  }
  hiss() { this.noise("highpass", 1800, 0.07, 0.55); }
  tick() {
    if (!this.on) return;
    const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = 1150;
    const end = this.env(o, 0.012, 0.002, 0.05); o.start(); o.stop(end);
  }
}

/* =============================================================================
   BOOT
   ========================================================================== */
function boot() {
  const rnd = mulberry32(CFG.seed || 2014);
  const css = getComputedStyle(document.documentElement);
  const isLightTheme = () => document.documentElement.getAttribute("data-theme") === "light";

  /* ---------- renderer, camera, post ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 200);
  const world = new THREE.Group();                        // the diorama
  scene.add(world);

  let composer = null, tiltH = null, tiltV = null;
  if (!isMobile) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    tiltH = new ShaderPass(TiltShift); tiltV = new ShaderPass(TiltShift);
    composer.addPass(tiltH); composer.addPass(tiltV);
    composer.addPass(new OutputPass());
  }

  /* ---------- shared uniforms / materials ---------- */
  const U = {
    night: { value: 0 }, lit: { value: new THREE.Color("#ffc777").multiplyScalar(2.2) },
    time: { value: 0 }, intro: { value: 0 }, pixel: { value: pixelRatio }
  };
  const tex = facadeTextures();
  function facadeMat(color, reveal) {
    const m = new THREE.MeshStandardMaterial({ color, map: tex.map, emissive: 0xffffff, emissiveMap: tex.em, roughness: 0.85, metalness: 0.02 });
    const R = reveal || { on: { value: 0 }, v: { value: 0 } };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uNight = U.night; sh.uniforms.uLit = U.lit;
      sh.uniforms.uRevealOn = R.on; sh.uniforms.uRevealV = R.v;
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uNight;\nuniform vec3 uLit;\nuniform float uRevealOn;\nuniform float uRevealV;")
        .replace("#include <emissivemap_fragment>", `
          #ifdef USE_EMISSIVEMAP
            vec4 emT = texture2D( emissiveMap, vEmissiveMapUv );
            float on = emT.g * step( 0.5, emT.b ) * step( emT.r, uNight );
            float rev = emT.g * step( vEmissiveMapUv.y, uRevealV ) * uRevealOn;
            totalEmissiveRadiance = uLit * max( on, rev );
          #endif`);
    };
    return m;
  }
  const M = {
    pave: new THREE.MeshStandardMaterial({ color: "#bdb8ae", roughness: 0.95 }),
    base: new THREE.MeshStandardMaterial({ color: "#3a3530", roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: "#7e8f69", roughness: 1 }),
    dirt: new THREE.MeshStandardMaterial({ color: "#8d7d66", roughness: 1 }),
    road: new THREE.MeshStandardMaterial({ color: "#34363b", roughness: 0.9 }),
    mark: new THREE.MeshStandardMaterial({ color: "#ece8de", roughness: 0.8 }),
    roof: new THREE.MeshStandardMaterial({ color: "#a29c92", roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: "#aaa59c", roughness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: "#D4A95C", roughness: 0.45, metalness: 0.35 }),
    graphite: new THREE.MeshStandardMaterial({ color: "#2b2e33", roughness: 0.7, metalness: 0.2 }),
    navy: new THREE.MeshStandardMaterial({ color: "#1d2c4f", roughness: 0.5, metalness: 0.2 }),
    white: new THREE.MeshStandardMaterial({ color: "#efede8", roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: "#20262f", roughness: 0.15, metalness: 0.6 }),
    stone: new THREE.MeshStandardMaterial({ color: "#c9c3b7", roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({ color: "#6f93a8", roughness: 0.08, metalness: 0.3 }),
    trunk: new THREE.MeshStandardMaterial({ color: "#5a4a3a", roughness: 1 })
  };

  function flat(shapePts, holes, mat, y) {
    const toV = (p) => new THREE.Vector2(p[0], -p[1]);
    const shape = new THREE.Shape(shapePts.map(toV));
    (holes || []).forEach((h) => shape.holes.push(new THREE.Path(h.map(toV))));
    const g = new THREE.ShapeGeometry(shape, 6); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.position.y = y; m.receiveShadow = true;
    world.add(m); return m;
  }
  function box(w, h, d, mat, x, y, z, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; world.add(m); return m;
  }

  /* ---------- ground: platform, grass, roads, markings ---------- */
  const plat = new THREE.Mesh(new RoundedBoxGeometry(PLAT * 2, 1.0, PLAT * 2, 3, 0.35), M.pave);
  plat.position.y = -0.5; plat.receiveShadow = true; world.add(plat);
  const base = new THREE.Mesh(new RoundedBoxGeometry(PLAT * 2 - 0.4, 0.7, PLAT * 2 - 0.4, 3, 0.3), M.base);
  base.position.y = -1.2; world.add(base);
  // soft contact shadow under the diorama (visible on the light page)
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(36, 36),
    new THREE.MeshBasicMaterial({ map: radialTexture("rgba(0,0,0,0.55)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = -1.7; world.add(shadowCatcher);

  flat(roundedRect(11.3, 11.3, 0.6), [roundedRect(10.15, 10.15, 3.0)], M.grass, 0.01);            // park ring
  flat(roundedRect(7.0, 2.2, 0.5).map(([x, z]) => [x, z - 4.85]), null, M.grass, 0.01);             // north yards
  flat(roundedRect(4.45, 2.2, 0.5).map(([x, z]) => [x - 2.55, z + 4.85]), null, M.grass, 0.01);     // south yards + park
  flat(roundedRect(2.15, 2.0, 0.2).map(([x, z]) => [x + SITE_X - 0.15, z + 5.0]), null, M.dirt, 0.012); // site
  flat(roundedRect(5.55, 0.95, 0.95), null, M.grass, 0.01);                                         // boulevard median
  flat(roundedRect(RING + ROAD_HALF, RING + ROAD_HALF, RING_R + ROAD_HALF), [roundedRect(RING - ROAD_HALF, RING - ROAD_HALF, RING_R - ROAD_HALF)], M.road, 0.02);
  flat(roundedRect(6.45, 1.85, 1.85), [roundedRect(5.55, 0.95, 0.95)], M.road, 0.02);

  // dashed centre line on the ring (one instanced mesh)
  {
    const centre = new Lane(roundedRect(RING, RING, RING_R));
    const n = Math.floor(centre.L / 0.6), dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.04).rotateX(-Math.PI / 2), M.mark, n);
    const o = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      centre.sample(i * 0.6, o);
      q.setFromAxisAngle(up, Math.atan2(-o.dz, o.dx)); p.set(o.x, 0.03, o.z);
      dash.setMatrixAt(i, m4.compose(p, q, sc));
    }
    dash.receiveShadow = true; world.add(dash);
  }
  // zebra crossing + stop lines on the south ring
  for (let i = 0; i < 7; i++) box(0.5, 0.005, 0.12, M.mark, CROSS_X, 0.03, RING - ROAD_HALF + 0.2 + i * 0.24, false);
  box(0.05, 0.005, ROAD_HALF, M.mark, CROSS_X - 0.5, 0.03, RING + ROAD_HALF / 2, false);
  box(0.05, 0.005, ROAD_HALF, M.mark, CROSS_X + 0.5, 0.03, RING - ROAD_HALF / 2, false);

  /* ---------- houses (each one is one of our projects) ---------- */
  const tints = ["#ece7dc", "#dcd5c8", "#cfc8bb", "#f1ece3", "#c4bdb0", "#e2dbcf"];
  const HOUSES = [
    { x: -5.3, z: -4.8, w: 2.4, d: 3.0, floors: 9 },
    { x: -1.8, z: -5.4, w: 2.0, d: 2.2, floors: 15 },
    { x: 1.6, z: -4.6, w: 2.6, d: 2.0, floors: 7 },
    { x: 5.2, z: -5.2, w: 2.4, d: 2.6, floors: 12 },
    { x: -5.4, z: 4.8, w: 2.4, d: 2.6, floors: 6 },
    { x: 0.8, z: 5.0, w: 2.0, d: 2.4, floors: 10 }
  ];
  function houseGeometry(def, u0, v0) {
    const h = def.floors * FLOOR_H, g = new THREE.BoxGeometry(def.w, h, def.d), uv = g.attributes.uv;
    for (let face = 0; face < 6; face++) {
      if (face === 2 || face === 3) continue;
      const width = face < 2 ? def.d : def.w, su = Math.max(1, Math.round(width / CELL_W)) / 16, sv = def.floors / 16;
      for (let k = 0; k < 4; k++) { const i = face * 4 + k; uv.setXY(i, u0 + uv.getX(i) * su, v0 + uv.getY(i) * sv); }
    }
    return g;
  }
  const edgeMat = new THREE.LineBasicMaterial({ color: "#D4A95C", transparent: true, opacity: 0.95 });
  const projects = SITE.projects || [];
  const siteProject = projects.find((p) => /строит/i.test(p.status || "")) || null;
  const homeProjects = projects.filter((p) => p !== siteProject);
  const pickables = [];
  HOUSES.forEach((def, i) => {
    const mat = facadeMat(tints[i % tints.length]);
    const g = houseGeometry(def, Math.floor(rnd() * 8) / 16, Math.floor(rnd() * 4) / 16);
    const m = new THREE.Mesh(g, [mat, mat, M.roof, M.roof, mat, mat]);
    const h = def.floors * FLOOR_H;
    m.position.set(def.x, h / 2, def.z); m.castShadow = m.receiveShadow = true; world.add(m);
    box(def.w * 0.3, 0.22, def.d * 0.3, M.roof, def.x + def.w * 0.18, h + 0.11, def.z - def.d * 0.15);   // roof machine room
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
    edges.position.copy(m.position); edges.scale.setScalar(1.01); edges.visible = false; world.add(edges);
    const pr = homeProjects[i];
    pickables.push({ mesh: m, edges, top: new THREE.Vector3(def.x, h + 0.4, def.z), project: pr || null });
  });

  /* ---------- construction site: fence, modules, scaffold, finished house ---------- */
  const fenceMat = new THREE.MeshStandardMaterial({ color: "#d9d2c3", roughness: 0.9 });
  box(4.3, 0.3, 0.04, fenceMat, 4.25, 0.15, 3.0);
  box(0.04, 0.3, 4.0, fenceMat, 2.1, 0.15, 5.0);
  box(0.04, 0.3, 4.0, fenceMat, 6.4, 0.15, 5.0);
  box(1.35, 0.3, 0.04, fenceMat, 2.78, 0.15, 7.0); box(1.35, 0.3, 0.04, fenceMat, 5.72, 0.15, 7.0);   // gate gap
  box(0.9, 0.42, 0.42, M.gold, 5.75, 0.21, 6.55);                                                     // site cabin
  box(1.9, SITE_BASE, 1.9, M.concrete, SITE_X, SITE_BASE / 2, SITE_Z);                              // foundation

  const modGeo = new THREE.BoxGeometry(MOD_W, MOD_H, MOD_D);
  const placedMods = new THREE.InstancedMesh(modGeo, M.concrete, MAX_MODS);
  placedMods.castShadow = placedMods.receiveShadow = true;
  world.add(placedMods);
  const slotPos = (k, out) => out.set(SITE_X, SITE_BASE + Math.floor(k / 2) * FLOOR_H + MOD_H / 2, SITE_Z + (k % 2 ? 0.4 : -0.4));
  {
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let k = 0; k < MAX_MODS; k++) placedMods.setMatrixAt(k, m4.makeTranslation(slotPos(k, p)));
  }
  // scaffolding (gold) grows with the house
  const SCAF = [];
  {
    const hw = MOD_W / 2 + 0.12, hd = MOD_D + 0.12;
    for (let f = 0; f < MAX_MODS / 2; f++) {
      const y0 = SITE_BASE + f * FLOOR_H, y1 = y0 + FLOOR_H;
      const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
      for (let i = 0; i < 4; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4];
        SCAF.push(SITE_X + ax, y1, SITE_Z + az, SITE_X + bx, y1, SITE_Z + bz);
        SCAF.push(SITE_X + ax, y0, SITE_Z + az, SITE_X + ax, y1, SITE_Z + az);
        SCAF.push(SITE_X + ax, y0, SITE_Z + az, SITE_X + (ax + bx) / 2, y1, SITE_Z + (az + bz) / 2);
      }
    }
  }
  const scafGeo = new THREE.BufferGeometry();
  scafGeo.setAttribute("position", new THREE.Float32BufferAttribute(SCAF, 3));
  const scaffold = new THREE.LineSegments(scafGeo, new THREE.LineBasicMaterial({ color: "#D4A95C", transparent: true, opacity: 0.85 }));
  world.add(scaffold);
  const SCAF_PER_FLOOR = 4 * 3 * 2;                       // vertices

  const towerReveal = { on: { value: 0 }, v: { value: 0 } };
  const towerDef = { w: 1.7, d: 1.7, floors: MAX_MODS / 2 };
  const towerGeo = houseGeometry(towerDef, 0, 0);
  const towerMat = facadeMat("#efe9df", towerReveal);
  towerMat.transparent = true;
  const tower = new THREE.Mesh(towerGeo, [towerMat, towerMat, M.roof, M.roof, towerMat, towerMat]);
  tower.position.set(SITE_X, SITE_BASE + (towerDef.floors * FLOOR_H) / 2, SITE_Z);
  tower.castShadow = tower.receiveShadow = true; tower.visible = false; world.add(tower);
  const towerLinesMat = new THREE.LineBasicMaterial({ color: "#D4A95C", transparent: true, opacity: 0 });
  const towerLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, towerDef.floors * FLOOR_H, 1.7, 1, towerDef.floors, 1)), towerLinesMat);
  towerLines.position.copy(tower.position); towerLines.visible = false; world.add(towerLines);
  pickables.push({ mesh: placedMods, alt: tower, edges: null, top: new THREE.Vector3(SITE_X, 2.6, SITE_Z), project: siteProject, isSite: true });

  /* ---------- tower crane ---------- */
  const crane = {
    th: 2.4, thV: { v: 0 }, r: 2.2, rV: { v: 0 }, h: HOOK_HIGH, hV: { v: 0 },
    tTh: 2.4, tR: 2.2, tH: HOOK_HIGH,
    sx: 0, sz: 0, svx: 0, svz: 0, pvx: 0, pvz: 0, ptx: 0, ptz: 0, first: true,
    step: null, timer: 0, carry: null, idleT: 0
  };
  {
    box(0.6, 0.2, 0.6, M.concrete, CRANE_X, 0.1, CRANE_Z);
    box(0.2, MAST_H, 0.2, M.gold, CRANE_X, MAST_H / 2, CRANE_Z);
    const lat = [];
    for (let y = 0.2; y < MAST_H - 0.3; y += 0.3) {
      for (const [ax, az, bx, bz] of [[-0.11, 0.11, 0.11, 0.11], [0.11, -0.11, 0.11, 0.11], [-0.11, -0.11, 0.11, -0.11], [-0.11, -0.11, -0.11, 0.11]]) {
        lat.push(CRANE_X + ax, y, CRANE_Z + az, CRANE_X + bx, y + 0.3, CRANE_Z + bz);
      }
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lat, 3));
    world.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: "#8a6a35" })));
  }
  const slew = new THREE.Group(); slew.position.set(CRANE_X, MAST_H, CRANE_Z); world.add(slew);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.14, 0.16), M.gold); jib.position.x = 1.3; jib.castShadow = true; slew.add(jib);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.32), M.graphite); cw.position.set(-1.0, -0.08, 0); cw.castShadow = true; slew.add(cw);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.24), M.glass); cab.position.set(0.25, -0.2, 0.14); slew.add(cab);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 4), M.gold); peak.position.y = 0.42; slew.add(peak);
  const beaconMat = new THREE.MeshBasicMaterial({ color: "#ff3b2f" });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), beaconMat); beacon.position.y = 0.8; slew.add(beacon);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.2), M.graphite); trolley.position.y = -0.1; slew.add(trolley);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), M.graphite); world.add(hook);
  const cableGeo = new THREE.BufferGeometry(); cableGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: "#2b2e33" })); cable.frustumCulled = false; world.add(cable);

  /* ---------- traffic lanes ---------- */
  const outer = new Lane(roundedRect(RING + LANE, RING + LANE, RING_R + LANE));               // counter clockwise
  const inner = new Lane(roundedRect(RING - LANE, RING - LANE, RING_R - LANE).reverse());     // clockwise
  const blvd = new Lane(roundedRect(6.0, 1.4, 1.4));
  outer.lightS = outer.nearest(CROSS_X - 0.55, RING + LANE);
  inner.lightS = inner.nearest(CROSS_X + 0.55, RING - LANE);
  const lanes = [outer, inner, blvd];
  const gateS = outer.nearest(SITE_X, RING + LANE), depotS = outer.nearest(-4, -(RING + LANE)), busStopS = inner.nearest(RING - LANE, 0);

  /* ---------- vehicles ---------- */
  const traffic = clamp(CFG.traffic || 1, 0.4, 1.6);
  const per = Math.round((isMobile ? 4 : 6) * traffic);
  const CAR_COLORS = ["#f2f2f0", "#c9ccd1", "#1c1d20", "#3a3f47", "#7a1f1f", "#D4A95C", "#1d2c4f", "#e6e2d6", "#5b6470"];
  const nCars = per * 2 + Math.max(2, Math.round(per * 0.7));
  const carBody = new THREE.InstancedMesh(new RoundedBoxGeometry(0.72, 0.17, 0.34, 2, 0.05).translate(0, 0.12, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 }), nCars);
  const carCab = new THREE.InstancedMesh(new RoundedBoxGeometry(0.38, 0.14, 0.3, 2, 0.05).translate(-0.04, 0.26, 0), M.glass, nCars);
  const lampGeo = (x) => mergeGeometries([new THREE.BoxGeometry(0.03, 0.035, 0.07).translate(x, 0.14, 0.11), new THREE.BoxGeometry(0.03, 0.035, 0.07).translate(x, 0.14, -0.11)]);
  const carHead = new THREE.InstancedMesh(lampGeo(0.36), new THREE.MeshBasicMaterial({ color: 0xffffff }), nCars);
  const carTail = new THREE.InstancedMesh(lampGeo(-0.36), new THREE.MeshBasicMaterial({ color: 0xffffff }), nCars);
  const glowMat = new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff });
  const carGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.95, 0.5).rotateX(-Math.PI / 2).translate(0.78, 0.035, 0), glowMat, nCars);
  carBody.castShadow = carCab.castShadow = true;
  [carBody, carCab, carHead, carTail, carGlow].forEach((m) => { m.frustumCulled = false; world.add(m); });

  const vehicles = [];
  function addVehicle(lane, s, kind, extra) {
    const v = Object.assign({ lane, s, v: 0.6, v0: 1.7 + rnd() * 0.8, len: 0.72, a: 0, pitch: 0, kind, stopS: null, state: "cruise", timer: 0 }, extra);
    lane.cars.push(v); vehicles.push(v); return v;
  }
  let ci = 0;
  const tmpC = new THREE.Color();
  function car(lane, s) {
    const v = addVehicle(lane, s, "car", { idx: ci });
    carBody.setColorAt(ci, tmpC.set(CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)]));
    ci++; return v;
  }
  // special vehicles are small groups
  function lights(group, xFront, xBack, y, w) {
    const head = new THREE.MeshBasicMaterial({ color: 0xffffff }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a1f });
    for (const z of [-w, w]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.08), head); h.position.set(xFront, y, z); group.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.08), tail); t.position.set(xBack, y, z); group.add(t);
    }
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6).rotateX(-Math.PI / 2), glowMat.clone()); g.position.set(xFront + 0.5, 0.03, 0); group.add(g);
    return { head, tail, glow: g.material };
  }
  function makeBus() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.42, 0.44, 2, 0.08), M.white); body.position.y = 0.3; body.castShadow = true; g.add(body);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.13, 0.45), M.glass); win.position.y = 0.38; g.add(win);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.61, 0.04, 0.45), M.gold); stripe.position.y = 0.2; g.add(stripe);
    world.add(g); return { group: g, lights: lights(g, 0.8, -0.8, 0.2, 0.15) };
  }
  function makeTruck() {
    const g = new THREE.Group();
    const cabM = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.36, 0.5, 2, 0.06), M.navy); cabM.position.set(0.72, 0.28, 0); cabM.castShadow = true; g.add(cabM);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.44), M.glass); win.position.set(0.94, 0.36, 0); g.add(win);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.46), M.graphite); chassis.position.y = 0.12; chassis.castShadow = true; g.add(chassis);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.6), M.graphite); bed.position.set(-0.24, 0.2, 0); g.add(bed);
    const mods = [0, 1].map((k) => {
      const m = new THREE.Mesh(modGeo, M.concrete); m.position.set(-0.24, 0.23 + MOD_H / 2 + k * (MOD_H + 0.01), 0);
      m.castShadow = true; m.userData.home = m.position.clone(); g.add(m); return m;
    });
    world.add(g); return { group: g, mods, lights: lights(g, 0.95, -0.95, 0.2, 0.17) };
  }

  for (let i = 0; i < per; i++) car(outer, (i / (per + 2)) * outer.L);
  for (let i = 0; i < per; i++) car(inner, (i / (per + 1)) * inner.L + 1.3);
  const nb = nCars - per * 2;
  for (let i = 0; i < nb; i++) car(blvd, (i / nb) * blvd.L);
  const bus = addVehicle(inner, (per / (per + 1)) * inner.L + 1.3, "bus", Object.assign({ len: 1.6, v0: 1.5 }, makeBus()));
  const trucks = [0, 1].map((k) => addVehicle(outer, ((per + k) / (per + 2)) * outer.L, "truck", Object.assign({ len: 1.9, v0: 1.4, loaded: true }, makeTruck())));

  /* ---------- traffic light ---------- */
  const TL = { phase: "green", t: 0 };
  const tlMats = { red: new THREE.MeshBasicMaterial(), yellow: new THREE.MeshBasicMaterial(), green: new THREE.MeshBasicMaterial() };
  for (const [x, z] of [[CROSS_X - 0.7, RING - ROAD_HALF - 0.25], [CROSS_X + 0.7, RING + ROAD_HALF + 0.25]]) {
    box(0.04, 0.9, 0.04, M.graphite, x, 0.45, z);
    box(0.1, 0.3, 0.1, M.graphite, x, 1.0, z);
    ["red", "yellow", "green"].forEach((c, i) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), tlMats[c]); s.position.set(x, 1.1 - i * 0.1, z + (z > RING ? -0.055 : 0.055)); world.add(s);
    });
  }
  // bus shelter + depot
  box(0.32, 0.03, 0.9, M.gold, RING - ROAD_HALF - 0.3, 0.42, 0);
  box(0.02, 0.4, 0.9, M.glass, RING - ROAD_HALF - 0.45, 0.2, 0);
  box(2.2, 0.9, 1.2, M.graphite, -4, 0.45, -(PLAT - 0.9));
  box(0.9, 0.6, 0.02, M.gold, -4, 0.3, -(PLAT - 1.51), false);

  /* ---------- people ---------- */
  const sideIn = new Lane(roundedRect(RING - ROAD_HALF - 0.32, RING - ROAD_HALF - 0.32, 1.1));
  const sideOut = new Lane(roundedRect(RING + ROAD_HALF + 0.35, RING + ROAD_HALF + 0.35, 3.2));
  const nWalk = isMobile ? 18 : 34, nCross = 6;
  const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.045, 0.11, 2, 6).translate(0, 0.1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), nWalk + nCross);
  people.castShadow = true; people.frustumCulled = false; world.add(people);
  const PEOPLE_COLORS = ["#2b2e33", "#D4A95C", "#1d2c4f", "#efede8", "#7a1f1f", "#5b6470", "#8a7a63"];
  const walkers = [];
  for (let i = 0; i < nWalk; i++) {
    const lane = i % 2 ? sideOut : sideIn;
    walkers.push({ lane, s: rnd() * lane.L, v: (0.25 + rnd() * 0.2) * (rnd() < 0.5 ? 1 : -1), off: (rnd() - 0.5) * 0.24, ph: rnd() * 6 });
    people.setColorAt(i, tmpC.set(PEOPLE_COLORS[i % PEOPLE_COLORS.length]));
  }
  const crossers = [];
  for (let i = 0; i < nCross; i++) {
    crossers.push({ side: i % 2, p: 0, moving: false, delay: rnd() * 0.8, x: CROSS_X + (rnd() - 0.5) * 0.6, ph: rnd() * 6 });
    people.setColorAt(nWalk + i, tmpC.set(PEOPLE_COLORS[(i + 3) % PEOPLE_COLORS.length]));
  }
  const Z_IN = RING - ROAD_HALF - 0.2, Z_OUT = RING + ROAD_HALF + 0.2;

  /* ---------- trees ---------- */
  const treePts = [];
  for (let s = 0; s < sideOut.L; s += 1.05) {
    const o = sideOut.sample(s, {}), r = 1.0 + rnd() * 0.5;
    const x = o.x - o.dz * r, z = o.z + o.dx * r;           // right of a counter clockwise loop = outward
    if (x > -6.2 && x < -1.8 && z < -9.5) continue;          // depot
    if (Math.abs(x) > PLAT - 0.4 || Math.abs(z) > PLAT - 0.4) continue;
    treePts.push([x, z, 0.8 + rnd() * 0.5]);
  }
  [-4.7, -3.7, -2.7, -1.7, 1.7, 2.7, 3.7, 4.7].forEach((x) => treePts.push([x, 0, 0.75]));
  for (let i = 0; i < 7; i++) treePts.push([-3.6 + rnd() * 2.6, 3.1 + rnd() * 3.6, 0.7 + rnd() * 0.4]);
  [[-3.5, -3.0], [-3.4, -6.6], [0.0, -3.0], [3.5, -6.7], [3.4, -3.0], [-5.4, 2.95], [-6.6, -2.9]].forEach(([x, z]) => treePts.push([x, z, 0.85]));
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0).translate(0, 0.75, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), treePts.length);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 0.45, 5).translate(0, 0.22, 0), M.trunk, treePts.length);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const greens = ["#5f7a4f", "#6d8a5a", "#56704a", "#7a9363"];
    treePts.forEach(([x, z, s], i) => {
      q.setFromAxisAngle(up, rnd() * 6); p.set(x, 0, z); sc.set(s, s * (0.9 + rnd() * 0.4), s);
      crowns.setMatrixAt(i, m4.compose(p, q, sc)); trunks.setMatrixAt(i, m4.compose(p, q, sc.set(1, s, 1)));
      crowns.setColorAt(i, tmpC.set(greens[i % greens.length]));
    });
  }
  crowns.castShadow = trunks.castShadow = true; crowns.receiveShadow = true;
  world.add(crowns, trunks);

  /* ---------- street lamps (poles + glow) ---------- */
  const lampPts = [];
  for (let s = 0.6; s < sideIn.L; s += 2.9) { const o = sideIn.sample(s, {}); lampPts.push([o.x, o.z]); }
  for (let s = 0.9; s < sideOut.L; s += 3.4) { const o = sideOut.sample(s, {}); lampPts.push([o.x, o.z]); }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 5).translate(0, 0.375, 0), M.graphite, lampPts.length);
  const lampPos = new Float32Array(lampPts.length * 3), lampDelay = new Float32Array(lampPts.length);
  lampPts.forEach(([x, z], i) => {
    poles.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0, z));
    lampPos.set([x, 0.78, z], i * 3); lampDelay[i] = Math.hypot(x, z) / 14;
  });
  world.add(poles);
  const lampGeoP = new THREE.BufferGeometry();
  lampGeoP.setAttribute("position", new THREE.BufferAttribute(lampPos, 3));
  lampGeoP.setAttribute("aDelay", new THREE.BufferAttribute(lampDelay, 1));
  const lampGlowMat = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uOn: { value: 0 }, uIntro: U.intro, uPixel: U.pixel, uSize: { value: 22 }, uColor: { value: new THREE.Color("#ffcf8a") } }
  });
  const lampGlow = new THREE.Points(lampGeoP, lampGlowMat); lampGlow.frustumCulled = false; world.add(lampGlow);

  /* ---------- fountain on the boulevard ---------- */
  {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.14, 32), M.stone); basin.position.y = 0.07; basin.receiveShadow = basin.castShadow = true; world.add(basin);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.76, 32).rotateX(-Math.PI / 2), M.water); water.position.y = 0.145; world.add(water);
    const n = isMobile ? 90 : 180, seeds = new Float32Array(n), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) seeds[i] = rnd();
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const fm = new THREE.ShaderMaterial({ vertexShader: FOUNTAIN_VERT, fragmentShader: FOUNTAIN_FRAG, transparent: true, depthWrite: false,
      uniforms: { uTime: U.time, uPixel: U.pixel, uColor: { value: new THREE.Color("#d8ecf6") } } });
    const jets = new THREE.Points(g, fm); jets.frustumCulled = false; world.add(jets);
    U.fountainColor = fm.uniforms.uColor;
  }

  /* ---------- light: sun, moon, sky ---------- */
  const hemi = new THREE.HemisphereLight("#dfe7f2", "#8a8f86", 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff1dc", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight("#86a2cf", 0); moon.position.set(-20, 30, -10); scene.add(moon);
  const C_DAY_SKY = new THREE.Color("#dfe7f2"), C_NIGHT_SKY = new THREE.Color("#3e4e72");
  const C_DAY_GND = new THREE.Color("#8a8f86"), C_NIGHT_GND = new THREE.Color("#1a1d26");
  const C_SUN = new THREE.Color("#fff1dc"), C_GOLD = new THREE.Color("#ffad5e");
  const C_WATER_DAY = new THREE.Color("#d8ecf6"), C_WATER_NIGHT = new THREE.Color("#ffd9a0");

  const DAY = Math.max(30, CFG.dayCycleSeconds || 90);
  const sh = CFG.startHour || {};
  let startHour = isLightTheme() ? (sh.light != null ? sh.light : 11) : (sh.dark != null ? sh.dark : 17.5);
  const hourParam = location.search.match(/[?&]hour=([\d.]+)/);   // e.g. ?hour=12 to open at noon
  if (hourParam) startHour = clamp(parseFloat(hourParam[1]), 0, 23.99);
  let tod = startHour;
  function sky(t) {
    tod = (startHour + (t / DAY) * 24) % 24;
    const elev = Math.sin(((tod - 6) / 12) * Math.PI);           // 1 at noon, -1 at midnight
    const night = 1 - smoothstep(-0.14, 0.2, elev);
    U.night.value = night;
    const az = (tod / 24) * Math.PI * 2 + 2.2, e = Math.max(elev, 0.12) * 1.1;
    sun.position.set(Math.cos(az) * Math.cos(e) * 40, Math.sin(e) * 40, Math.sin(az) * Math.cos(e) * 40);
    sun.intensity = 2.5 * smoothstep(-0.06, 0.32, elev);
    sun.color.copy(C_SUN).lerp(C_GOLD, 1 - smoothstep(0.05, 0.45, elev));
    hemi.color.copy(C_NIGHT_SKY).lerp(C_DAY_SKY, 1 - night);
    hemi.groundColor.copy(C_NIGHT_GND).lerp(C_DAY_GND, 1 - night);
    hemi.intensity = lerp(1.0, 1.05, 1 - night);
    moon.intensity = 1.1 * night;
    lampGlowMat.uniforms.uOn.value = smoothstep(0.25, 0.7, night);
    if (U.fountainColor) U.fountainColor.value.copy(C_WATER_DAY).lerp(C_WATER_NIGHT, night);
  }

  /* ---------- hero environment follows the scene's time of day ----------
     The hero (and the nav while it floats over it) gets its own colours:
     night → dark, dawn and sunset → warm dark, day → light. The rest of the
     site keeps the chosen theme; while the hero scrolls away its colours blend
     into the theme, so the next section joins it seamlessly. */
  const navEl = document.getElementById("nav");
  const TH = SITE.theme || {};
  const DARK_T = TH.colors || {}, LIGHT_T = Object.assign({}, DARK_T, TH.light || {});
  function rgba(c) {
    c = String(c || "").trim();
    if (c[0] === "#") {
      const h = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    }
    const m = c.match(/[\d.]+/g) || [0, 0, 0, 1];
    return [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1];
  }
  function palette(t, light) {
    return {
      "--bg": rgba(t.bg), "--bg-elevated": rgba(t.bgElevated), "--text": rgba(t.text), "--muted": rgba(t.muted),
      "--gold": rgba(t.gold), "--gold-soft": rgba(t.goldSoft), "--line": rgba(t.line),
      "--on-accent": rgba(light ? "#FFFFFF" : "#131209"),
      "--glass": rgba(light ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)"),
      "--glass-edge": rgba(light ? "rgba(13,33,80,0.12)" : "rgba(255,255,255,0.12)"),
      "--shadow": rgba(light ? "rgba(13,33,80,0.28)" : "rgba(0,0,0,0.85)"),
      "--hero-grad-from": rgba(light ? "#000000" : "#FFFFFF"),
      "--hero-grad-to": rgba(light ? "#666666" : "#9B9B9B"),
      "--hero-summary": rgba(light ? "#2C3A52" : t.muted)
    };
  }
  const PAL_D = palette(DARK_T, false), PAL_L = palette(LIGHT_T, true);
  const ENV_KEYS = Object.keys(PAL_D);
  // colour of the sky behind the diorama by hour (D / L = the theme backgrounds)
  const SKY_KEYS = [[0, "D"], [4.8, "D"], [5.6, "#120f0c"], [6.3, "#2b2117"], [7.1, "#efe6d8"], [8.5, "L"],
    [16.3, "L"], [17.2, "#f0e4d2"], [17.9, "#2d2218"], [18.8, "#0c0e14"], [20, "D"], [24, "D"]]
    .map(([h, c]) => [h, c === "D" ? PAL_D["--bg"] : c === "L" ? PAL_L["--bg"] : rgba(c)]);
  const mixA = (a, b, t, out) => { for (let i = 0; i < 4; i++) out[i] = a[i] + (b[i] - a[i]) * t; return out; };
  const lumA = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const cssA = (c) => c[3] >= 0.999
    ? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
    : `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
  const ENV = {}, OUT = {}, skyBg = [0, 0, 0, 1];
  ENV_KEYS.forEach((k) => { ENV[k] = [0, 0, 0, 1]; OUT[k] = [0, 0, 0, 1]; });
  const heroWritten = {}, navWritten = {};
  let envLight = 0, navHasEnv = false;
  function writeVars(el, cache) {
    for (const k of ENV_KEYS) {
      const v = cssA(OUT[k]);
      if (cache[k] !== v) { el.style.setProperty(k, v); cache[k] = v; }
    }
  }
  const scrollP = () => (hero ? clamp01(window.scrollY / (hero.offsetHeight * 0.85)) : 1);
  function updateEnv(p) {
    if (!hero) return;
    let i = 0;
    while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= tod) i++;
    const [h0, c0] = SKY_KEYS[i], [h1, c1] = SKY_KEYS[i + 1];
    mixA(c0, c1, smoothstep(0, 1, (tod - h0) / (h1 - h0)), skyBg);
    const w = smoothstep(0.35, 0.6, lumA(skyBg));          // text palette flips with the sky
    const theme = isLightTheme() ? PAL_L : PAL_D;
    const sp = smoothstep(0, 1, p);
    for (const k of ENV_KEYS) {
      if (k === "--bg") mixA(skyBg, skyBg, 0, ENV[k]); else mixA(PAL_D[k], PAL_L[k], w, ENV[k]);
      mixA(ENV[k], theme[k], sp, OUT[k]);
    }
    envLight = lumA(OUT["--bg"]);
    writeVars(hero, heroWritten);
    const fade = smoothstep(0, 0.3, p).toFixed(3);
    if (heroWritten.fade !== fade) { hero.style.setProperty("--hero-fade", fade); heroWritten.fade = fade; }
    if (!navEl) return;
    if (sp < 0.999) {
      writeVars(navEl, navWritten); navHasEnv = true;
      navEl.dataset.env = envLight > 0.5 ? "light" : "dark";
    } else if (navHasEnv) {                                   // past the hero: the nav is the site's again
      ENV_KEYS.forEach((k) => { navEl.style.removeProperty(k); delete navWritten[k]; });
      delete navEl.dataset.env; navHasEnv = false;
    }
  }

  /* ---------- HUD + labels ---------- */
  const elTime = document.getElementById("scene-time"), elPhase = document.getElementById("scene-phase");
  const elLabel = document.getElementById("scene-label"), elCaption = document.getElementById("scene-caption");
  const PHASES = CFG.phases || ["Ночь", "Утро", "День", "Вечер"];
  const CAP = Object.assign({ delivery: "Панели прибыли на площадку", floor: "Смонтирован этаж {n} из {max}", done: "Дом сдан. В окнах загорается свет", next: "Следующий проект начинается с чертежа" }, CFG.captions || {});
  let hudT = 0, captionUntil = 0, captionText = "";
  function setCaption(text, seconds) {
    if (!elCaption) return;
    if (text !== captionText) {
      captionText = text;
      elCaption.innerHTML = text.split(" ").map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ");
      elCaption.classList.remove("show"); void elCaption.offsetWidth;
    }
    elCaption.classList.add("show");
    captionUntil = U.time.value + seconds;
  }

  /* ---------- sound toggle ---------- */
  const sound = new CitySound();
  const soundBtn = document.getElementById("scene-sound");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const on = soundBtn.getAttribute("aria-pressed") !== "true";
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      try { if (on) sound.start(); else sound.stop(); } catch (e) { console.warn("[scene] sound:", e); }
    });
  }

  /* ---------- site + crane logic ---------- */
  const site = { state: "waiting", assigned: null, truck: null, placed: START_MODS, t: 0 };
  const P = new THREE.Vector3(), Q = new THREE.Vector3();
  function refreshTower() {
    placedMods.count = site.placed;
    const floors = Math.min(MAX_MODS / 2, Math.ceil(site.placed / 2) + 1);
    scafGeo.setDrawRange(0, floors * SCAF_PER_FLOOR);
  }
  refreshTower();
  function aimAt(x, z) {
    const a = Math.atan2(z - CRANE_Z, x - CRANE_X);
    crane.tTh = crane.th + wrapAngle(a - crane.th);
    crane.tR = clamp(Math.hypot(x - CRANE_X, z - CRANE_Z), 0.6, 3.8);
  }
  const near = (a, b, e) => Math.abs(a - b) < e;
  function craneStep(dt) {
    const c = crane;
    if (!c.step) {                                               // idle: a slow look around
      c.idleT += dt;
      if (c.idleT > 6) { c.idleT = 0; aimAt(SITE_X + (rnd() - 0.5) * 3, SITE_Z + (rnd() - 0.5) * 3); c.tH = HOOK_HIGH; }
      return;
    }
    const tr = site.truck;
    switch (c.step) {
      case "raise": c.tH = HOOK_HIGH; if (near(c.h, HOOK_HIGH, 0.06)) c.step = "slewPick"; break;
      case "slewPick": {
        const m = tr.mods.filter((mm) => mm.parent === tr.group && mm.visible).pop();
        if (!m) { c.step = "done"; break; }
        c.target = m; m.getWorldPosition(P); world.worldToLocal(P);
        aimAt(P.x, P.z);
        if (near(c.th, c.tTh, 0.012) && near(c.r, c.tR, 0.03)) c.step = "lowerPick";
        break;
      }
      case "lowerPick": c.target.getWorldPosition(P); world.worldToLocal(P); c.tH = P.y + MOD_H / 2 + 0.08;
        if (near(c.h, c.tH, 0.03)) { c.step = "attach"; c.timer = 0.6; sound.clank(); } break;
      case "attach": c.timer -= dt; if (c.timer <= 0) { world.attach(c.target); c.carry = c.target; c.step = "hoist"; } break;
      case "hoist": c.tH = HOOK_HIGH; if (near(c.h, HOOK_HIGH, 0.08)) c.step = "slewPlace"; break;
      case "slewPlace": slotPos(site.placed, P); aimAt(P.x, P.z);
        if (near(c.th, c.tTh, 0.012) && near(c.r, c.tR, 0.03)) c.step = "lowerPlace"; break;
      case "lowerPlace": slotPos(site.placed, P); c.tH = P.y + MOD_H / 2 + 0.08;
        if (near(c.h, c.tH, 0.03)) { c.step = "release"; c.timer = 0.45; } break;
      case "release":
        c.timer -= dt;
        if (c.timer <= 0) {
          const m = c.carry; c.carry = null;
          m.visible = false; tr.group.attach(m); m.position.copy(m.userData.home); m.quaternion.identity(); m.scale.set(1, 0.001, 1);
          site.placed++; refreshTower(); sound.thud(); sound.chime(site.placed - START_MODS);
          if (site.placed % 2 === 0) setCaption(CAP.floor.replace("{n}", site.placed / 2).replace("{max}", MAX_MODS / 2), 3.5);
          c.step = site.placed >= MAX_MODS ? "done" : "raise";
        }
        break;
      case "done":
        tr.loaded = false; tr.state = "leave"; tr.stopS = null;
        site.assigned = null; site.truck = null; c.step = null; c.idleT = 0;
        site.state = site.placed >= MAX_MODS ? "complete" : "waiting"; site.t = 0;
        if (site.state === "complete") {
          placedMods.visible = false; scaffold.visible = false; tower.visible = true; towerMat.opacity = 1;
          towerReveal.on.value = 1; towerReveal.v.value = 0;
          setCaption(CAP.done, 6);
          [0, 2, 4, 7].forEach((n, i) => setTimeout(() => sound.chime(n), i * 180));
        }
        break;
    }
  }
  function siteStep(dt) {
    site.t += dt;
    if (site.state === "complete") {
      towerReveal.v.value = clamp01(site.t / 2.6) * (towerDef.floors / 16);   // windows light up from the bottom
      if (site.t > 12) { site.state = "dissolve"; site.t = 0; towerLines.visible = true; setCaption(CAP.next, 4); }
    } else if (site.state === "dissolve") {
      const t = site.t;
      towerLinesMat.opacity = smoothstep(0, 0.6, t) * (1 - smoothstep(1.8, 3.2, t));
      towerMat.opacity = 1 - smoothstep(0.4, 1.6, t);
      if (t > 1.6 && tower.visible) {
        tower.visible = false; towerReveal.on.value = 0;
        site.placed = START_MODS; placedMods.visible = true; scaffold.visible = true; refreshTower();
      }
      if (t > 3.2) { towerLines.visible = false; site.state = "waiting"; }
    }
  }

  /* ---------- vehicles step ---------- */
  const O = { x: 0, z: 0, dx: 1, dz: 0 };
  const m4 = new THREE.Matrix4(), qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), qq = new THREE.Quaternion();
  const vp = new THREE.Vector3(), vs = new THREE.Vector3(1, 1, 1), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
  const stopped = (c) => c.stopS != null && c.lane.ahead(c.s + c.len / 2, c.stopS) < 0.3 && c.v < 0.04;
  let lastPhase = "green";
  function trafficStep(dt) {
    // traffic light: 10 s green, 2 s yellow, 6 s red
    TL.t = (TL.t + dt) % 18;
    TL.phase = TL.t < 10 ? "green" : TL.t < 12 ? "yellow" : "red";
    if (TL.phase !== lastPhase) { lastPhase = TL.phase; sound.tick(); }

    // special vehicles decide where they want to stop
    if (bus.state === "cruise") { bus.stopS = inner.wrap(busStopS + bus.len / 2); if (stopped(bus)) { bus.state = "dwell"; bus.timer = 3.4; sound.hiss(); } }
    else if (bus.state === "dwell") { bus.timer -= dt; if (bus.timer <= 0) { bus.state = "leave"; bus.stopS = null; } }
    else if (bus.state === "leave" && inner.ahead(busStopS, bus.s) > 4 && inner.ahead(busStopS, bus.s) < inner.L - 4) bus.state = "cruise";

    trucks.forEach((tr) => {
      const front = tr.s + tr.len / 2;
      if (tr.state === "cruise") {
        if (tr.loaded) {
          const gF = outer.wrap(gateS + tr.len / 2);
          const accept = site.state === "waiting" && (site.assigned === null || site.assigned === tr);
          if (accept && outer.ahead(front, gF) < 10) site.assigned = tr;
          tr.stopS = accept && site.assigned === tr ? gF : null;
          if (tr.stopS != null && stopped(tr)) {
            tr.state = "unload"; site.state = "unloading"; site.truck = tr; crane.step = "raise";
            setCaption(CAP.delivery, 3); sound.hiss();
          }
        } else {
          tr.stopS = outer.wrap(depotS + tr.len / 2);
          if (stopped(tr)) { tr.state = "reload"; tr.timer = 0; }
        }
      } else if (tr.state === "reload") {
        tr.timer += dt;
        tr.mods.forEach((m, k) => { m.visible = true; m.scale.y = Math.max(0.001, easeInOut(clamp01((tr.timer - k * 0.5) / 0.9))); });
        if (tr.timer > 2.2) { tr.loaded = true; tr.state = "leave"; tr.stopS = null; tr.pointS = depotS; }
      } else if (tr.state === "leave") {
        const from = tr.pointS != null ? tr.pointS : gateS;
        if (outer.ahead(from, tr.s) > 4 && outer.ahead(from, tr.s) < outer.L - 4) { tr.state = "cruise"; tr.pointS = null; }
      }
    });

    let speedSum = 0;
    for (const lane of lanes) {
      const cs = lane.cars; cs.sort((a, b) => a.s - b.s);
      const n = cs.length;
      for (let i = 0; i < n; i++) {
        const c = cs[i], front = c.s + c.len / 2;
        let gap = 1e3, vl = c.v0;
        if (n > 1) {
          const L = cs[(i + 1) % n];
          gap = lane.ahead(front, L.s - L.len / 2); vl = L.v;
          if (gap > lane.L - 2) gap = 0.01;
        }
        if (lane.lightS != null && TL.phase !== "green") {
          const g = lane.ahead(front, lane.lightS), need = (c.v * c.v) / (2 * (TL.phase === "yellow" ? 2.2 : 4.5));
          if (g < 14 && g > need && g < gap) { gap = g; vl = 0; }
        }
        if (c.stopS != null) { const g = lane.ahead(front, c.stopS); if (g < 14 && g < gap) { gap = g; vl = 0; } }
        c.a = clamp(idm(c.v, c.v0, gap, c.v - vl), -7, 1.6);
        if (c.state === "unload" || c.state === "reload" || c.state === "dwell") { c.a = 0; c.v = 0; }
        c.v = Math.max(0, c.v + c.a * dt);
        c.s = lane.wrap(c.s + c.v * dt);
        speedSum += c.v;
      }
    }
    return speedSum / vehicles.length;
  }

  function placeVehicles(dt, night) {
    const headC = tmpC;
    for (const c of vehicles) {
      c.lane.sample(c.s, O);
      const yaw = Math.atan2(-O.dz, O.dx);
      c.pitch += (clamp(c.a * 0.02, -0.07, 0.035) - c.pitch) * Math.min(1, dt * 6);   // nose dives when braking
      qYaw.setFromAxisAngle(AY, yaw); qPitch.setFromAxisAngle(AZ, c.pitch); qq.multiplyQuaternions(qYaw, qPitch);
      vp.set(O.x, 0.02, O.z);
      const braking = c.a < -0.4 || c.v < 0.05;
      const tail = braking ? 2.2 : 0.35 + night * 0.6;
      if (c.kind === "car") {
        m4.compose(vp, qq, vs);
        carBody.setMatrixAt(c.idx, m4); carCab.setMatrixAt(c.idx, m4); carHead.setMatrixAt(c.idx, m4); carTail.setMatrixAt(c.idx, m4); carGlow.setMatrixAt(c.idx, m4);
        carHead.setColorAt(c.idx, headC.setRGB(1, 0.92, 0.78).multiplyScalar(0.25 + night * 2.4));
        carTail.setColorAt(c.idx, headC.setRGB(1, 0.08, 0.05).multiplyScalar(tail));
        carGlow.setColorAt(c.idx, headC.setRGB(1, 0.78, 0.5).multiplyScalar(night * 0.32));
      } else {
        c.group.position.copy(vp); c.group.quaternion.copy(qq);
        c.lights.head.color.setRGB(1, 0.92, 0.78).multiplyScalar(0.25 + night * 2.4);
        c.lights.tail.color.setRGB(1, 0.08, 0.05).multiplyScalar(tail);
        c.lights.glow.color.setRGB(1, 0.78, 0.5).multiplyScalar(night * 0.35);
      }
    }
    [carBody, carCab, carHead, carTail, carGlow].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    [carHead, carTail, carGlow].forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  }

  function peopleStep(dt, t) {
    let k = 0;
    for (const w of walkers) {
      w.s = w.lane.wrap(w.s + w.v * dt);
      w.lane.sample(w.s, O);
      const bob = Math.abs(Math.sin(t * 7 + w.ph)) * 0.025;
      vp.set(O.x - O.dz * w.off, 0.02 + bob, O.z + O.dx * w.off);
      people.setMatrixAt(k++, m4.makeTranslation(vp));
    }
    const red = TL.phase === "red" && TL.t > 12.4 && TL.t < 14.2;
    for (const c of crossers) {
      if (!c.moving && red && TL.t > 12.4 + c.delay) { c.moving = true; c.p = 0; }
      if (c.moving) { c.p += dt * 0.55 / (Z_OUT - Z_IN); if (c.p >= 1) { c.moving = false; c.side = 1 - c.side; c.p = 0; } }
      const from = c.side ? Z_OUT : Z_IN, to = c.side ? Z_IN : Z_OUT;
      const z = c.moving ? lerp(from, to, c.p) : from;
      const bob = c.moving ? Math.abs(Math.sin(t * 8 + c.ph)) * 0.025 : 0;
      vp.set(c.x, 0.02 + bob, z);
      people.setMatrixAt(k++, m4.makeTranslation(vp));
    }
    people.instanceMatrix.needsUpdate = true;
  }

  /* ---------- crane motion (springs + swinging hook) ---------- */
  function craneMotion(dt, t) {
    const c = crane;
    c.th = smoothDamp(c.th, c.tTh, c.thV, 1.3, dt);
    c.r = smoothDamp(c.r, c.tR, c.rV, 0.9, dt);
    c.h = smoothDamp(c.h, c.tH, c.hV, 0.8, dt);
    slew.rotation.y = -c.th;
    trolley.position.x = c.r;
    const tx = CRANE_X + Math.cos(c.th) * c.r, tz = CRANE_Z + Math.sin(c.th) * c.r;
    if (c.first) { c.ptx = tx; c.ptz = tz; c.first = false; }
    const vx = (tx - c.ptx) / Math.max(dt, 1e-3), vz = (tz - c.ptz) / Math.max(dt, 1e-3);
    const ax = (vx - c.pvx) / Math.max(dt, 1e-3), az = (vz - c.pvz) / Math.max(dt, 1e-3);
    c.ptx = tx; c.ptz = tz; c.pvx = vx; c.pvz = vz;
    // pendulum: the hook lags behind the trolley and swings back
    const k = 7, d = 1.6, g = 0.06;
    c.svx += (-k * c.sx - d * c.svx - clamp(ax, -20, 20) * g) * dt;
    c.svz += (-k * c.sz - d * c.svz - clamp(az, -20, 20) * g) * dt;
    c.sx = clamp(c.sx + c.svx * dt, -0.35, 0.35); c.sz = clamp(c.sz + c.svz * dt, -0.35, 0.35);
    const hx = tx + c.sx, hz = tz + c.sz;
    hook.position.set(hx, c.h, hz);
    const arr = cableGeo.attributes.position.array;
    arr[0] = tx; arr[1] = MAST_H - 0.12; arr[2] = tz; arr[3] = hx; arr[4] = c.h + 0.05; arr[5] = hz;
    cableGeo.attributes.position.needsUpdate = true;
    if (c.carry) { c.carry.position.set(hx, c.h - 0.06 - MOD_H / 2, hz); c.carry.rotation.y = c.sx * 0.4; }
    beaconMat.color.setRGB(1, 0.23, 0.18).multiplyScalar(0.3 + U.night.value * (Math.sin(t * 4) > 0.6 ? 3 : 0.2));
  }

  /* ---------- camera choreography ---------- */
  const cam = { az: 0.62, autoAz: 0, userAz: 0, userV: 0, focus: 0, focusV: { v: 0 }, baseDist: 46 };
  const target = new THREE.Vector3(), centre = new THREE.Vector3(0, 1.0, 0), siteFocus = new THREE.Vector3(SITE_X, 1.6, SITE_Z);
  const camOff = new THREE.Vector2();
  let W = 1, H = 1, mx = 0, my = 0;
  function placeCamera(t, dt) {
    const busy = site.state !== "waiting" || crane.step != null;
    cam.focus = smoothDamp(cam.focus, busy ? 1 : 0, cam.focusV, 2.4, Math.max(dt, 1e-3));
    if (CFG.autoOrbit !== false && !reduce) cam.autoAz += dt * 0.03 * (1 + 0.6 * Math.sin(t * 0.09));   // speed waves
    if (!dragging) { cam.userAz += cam.userV; cam.userV *= 0.93; }
    // while the site is busy, steer the orbit back to a view where it is not hidden by houses
    if (cam.focus > 0.01 && !dragging) {
      const total = cam.az + cam.autoAz + cam.userAz, PREF = cam.az;
      const want = PREF + Math.round((total - PREF) / (Math.PI * 2)) * Math.PI * 2;
      cam.autoAz += (want - total) * Math.min(1, dt * 0.5) * cam.focus;
    }
    camOff.x += (mx - camOff.x) * 0.04; camOff.y += (my - camOff.y) * 0.04;
    const scrollP = hero ? clamp01(window.scrollY / hero.offsetHeight) : 0;
    const az = cam.az + cam.autoAz + cam.userAz + camOff.x * 0.06;
    const el = 0.6 + 0.035 * Math.sin(t * 0.07) + scrollP * 0.22 - camOff.y * 0.03;
    const dist = cam.baseDist * (1 - 0.1 * cam.focus) + Math.sin(t * 0.05) * 0.8;
    target.copy(centre).lerp(siteFocus, cam.focus * 0.35).add(world.position);
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(target);
    if (tiltH) {
      Q.copy(target).project(camera);
      const f = (Q.y + 1) / 2;
      tiltH.uniforms.uFocus.value = f; tiltV.uniforms.uFocus.value = f;
    }
  }

  /* ---------- labels pinned to projected anchors ---------- */
  const heroRect = { left: 0, top: 0 }, canvasRect = { left: 0, top: 0, width: 1, height: 1 };
  function project(v, out) {
    P.copy(v).add(world.position).project(camera);
    out.x = canvasRect.left - heroRect.left + ((P.x + 1) / 2) * canvasRect.width;
    out.y = canvasRect.top - heroRect.top + ((1 - P.y) / 2) * canvasRect.height;
    out.vis = P.z < 1;
    return out;
  }
  const lp = { x: 0, y: 0, vis: false };
  let hovered = null;
  function setHover(p) {
    if (p === hovered) return;
    if (hovered && hovered.edges) hovered.edges.visible = false;
    hovered = p;
    if (p && p.edges) p.edges.visible = true;
    canvas.toggleAttribute("data-cursor", !!(p && p.project));
    if (!elLabel) return;
    if (p && p.project) {
      const pr = p.project, esc = (s) => String(s || "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
      elLabel.href = "project.html?id=" + encodeURIComponent(pr.id);
      elLabel.innerHTML = `<span class="sl-status">${esc(p.isSite ? CFG.siteLabel || "Строится сейчас" : pr.status)}</span>` +
        `<strong class="sl-title">${esc(pr.title)}</strong><span class="sl-cta">Смотреть проект →</span>`;
      elLabel.hidden = false; requestAnimationFrame(() => elLabel.classList.add("show"));
    } else { elLabel.classList.remove("show"); }
  }
  function placeLabels() {
    if (elLabel && hovered && hovered.project) {
      project(hovered.top, lp);
      elLabel.style.transform = `translate(${lp.x.toFixed(1)}px, ${lp.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (elCaption) {
      if (U.time.value > captionUntil) elCaption.classList.remove("show");
      project(Q.set(SITE_X, SITE_BASE + Math.max(site.placed, START_MODS) / 2 * FLOOR_H + 1.2, SITE_Z), lp);
      elCaption.style.transform = `translate(${lp.x.toFixed(1)}px, ${lp.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  /* ---------- interaction ---------- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickMeshes = pickables.map((p) => p.mesh).concat([tower]);
  let pointer = null, dragging = false, downX = 0, downY = 0, lastX = 0, moved = 0;
  function measure() {
    const r = canvas.getBoundingClientRect(), hr = hero ? hero.getBoundingClientRect() : r;
    canvasRect.left = r.left; canvasRect.top = r.top; canvasRect.width = r.width; canvasRect.height = r.height;
    heroRect.left = hr.left; heroRect.top = hr.top;
  }
  function pick() {
    if (!pointer) return setHover(null);
    measure();
    const x = pointer.x - canvasRect.left, y = pointer.y - canvasRect.top;
    if (x < 0 || y < 0 || x > canvasRect.width || y > canvasRect.height) return setHover(null);
    ndc.set((x / canvasRect.width) * 2 - 1, -(y / canvasRect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickMeshes, false)[0];
    setHover(hit ? pickables.find((p) => p.mesh === hit.object || p.alt === hit.object) || null : null);
  }
  window.addEventListener("pointermove", (e) => {
    const overUi = e.target.closest && e.target.closest(".nav, .hero-actions, .hero-process, .cookie");
    pointer = overUi ? null : { x: e.clientX, y: e.clientY };
    mx = (e.clientX / window.innerWidth) * 2 - 1; my = (e.clientY / window.innerHeight) * 2 - 1;
    if (dragging) { const dx = e.clientX - lastX; cam.userAz -= dx * 0.005; cam.userV = -dx * 0.005; lastX = e.clientX; moved += Math.abs(dx); }
  }, { passive: true });
  canvas.addEventListener("pointerdown", (e) => {
    downX = e.clientX; downY = e.clientY; moved = 0;
    if (e.pointerType === "touch") { pointer = { x: e.clientX, y: e.clientY }; return; }
    dragging = true; lastX = e.clientX; cam.userV = 0; canvas.style.cursor = "grabbing";
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointerup", (e) => {
    const click = Math.hypot(e.clientX - downX, e.clientY - downY) < 6;
    if (dragging && click && hovered && hovered.project) location.href = elLabel ? elLabel.href : "project.html?id=" + hovered.project.id;
    dragging = false; canvas.style.cursor = "grab";
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer = null; });
  canvas.style.cursor = "grab";

  /* ---------- framing: the diorama sits to the right of the hero copy ---------- */
  function resize() {
    measure();
    W = Math.max(1, canvasRect.width); H = Math.max(1, canvasRect.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const aspect = W / H;
    if (aspect > 1.05) {
      cam.baseDist = aspect > 1.5 ? 64 : 72;
      camera.setViewOffset(W, H, -W * (aspect > 1.5 ? 0.26 : 0.2), H * 0.02, W, H);
    } else {
      cam.baseDist = 84;
      camera.setViewOffset(W, H, 0, -H * 0.2, W, H);
    }
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(pixelRatio); composer.setSize(W, H);
      tiltH.uniforms.uDelta.value.set(1.6 / W, 0); tiltV.uniforms.uDelta.value.set(0, 1.6 / H);
    }
    if (!looping) render();
  }

  function render() {
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  /* ---------- loop ---------- */
  let last = 0, t = 0, looping = false;
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now; t += dt;
    U.time.value = t;
    const intro = clamp01(t / 2.4);
    U.intro.value = intro;
    world.position.y = -3 * (1 - easeInOut(intro));
    sky(t);
    updateEnv(scrollP());
    shadowCatcher.material.opacity = 0.55 * smoothstep(0.4, 0.75, envLight);
    const speed = trafficStep(dt);
    craneStep(dt); siteStep(dt);
    placeVehicles(dt, U.night.value);
    peopleStep(dt, t);
    craneMotion(dt, t);
    TL_UPDATE();
    placeCamera(t, dt);
    pick();
    placeLabels();
    sound.update(dt, U.night.value, speed);
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.25; updateHud(); }
    render();
  }
  function TL_UPDATE() {
    const on = (p) => (TL.phase === p ? 2.4 : 0.12);
    tlMats.red.color.setRGB(1, 0.12, 0.08).multiplyScalar(on("red"));
    tlMats.yellow.color.setRGB(1, 0.7, 0.1).multiplyScalar(on("yellow"));
    tlMats.green.color.setRGB(0.15, 1, 0.45).multiplyScalar(on("green"));
  }
  function updateHud() {
    const hh = Math.floor(tod), mm = Math.floor((tod - hh) * 60);
    if (elTime) elTime.textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
    if (elPhase) elPhase.textContent = PHASES[tod < 5 || tod >= 22 ? 0 : tod < 11 ? 1 : tod < 17 ? 2 : 3] || "";
  }

  window.addEventListener("resize", resize, { passive: true });

  function applyTheme() {
    updateEnv(scrollP());
    shadowCatcher.material.opacity = 0.55 * smoothstep(0.4, 0.75, envLight);
    if (!looping) render();
  }

  resize();
  applyTheme();

  if (reduce || stillMode) {
    // a calm finished frame: evening, lights on, traffic in place
    t = ((20 - startHour + 24) % 24) / 24 * DAY;
    U.intro.value = 1; world.position.y = 0;
    sky(t); trafficStep(0); placeVehicles(0.016, U.night.value); peopleStep(0, 0); craneMotion(0.016, 0); TL_UPDATE();
    placeCamera(0, 0.016); updateHud(); applyTheme();
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { ticking = false; applyTheme(); });
    }, { passive: true });
  } else {
    let visible = true;
    const sync = () => {
      const on = visible && !document.hidden;
      if (on === looping) return;
      looping = on; last = 0;
      renderer.setAnimationLoop(on ? frame : null);
      if (!on) updateEnv(scrollP());
    };
    if (hero && "IntersectionObserver" in window) new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; sync(); }).observe(hero);
    document.addEventListener("visibilitychange", sync);
    sync();
  }

  document.documentElement.classList.add("scene-ready");
  window.__SCENE = {
    scene, camera, renderer, world, uniforms: U, site, crane, TL, applyTheme, render,
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, vehicles: vehicles.length, people: nWalk + nCross, tod: tod.toFixed(2), site: site.state, placed: site.placed, crane: crane.step })
  };
}

/* start (after every constant above is initialised) */
if (canvas && CFG.enabled !== false) {
  try { boot(); }
  catch (e) { console.warn("[scene] disabled:", e); canvas.style.display = "none"; }
}
