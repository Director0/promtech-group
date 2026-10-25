/* =============================================================================
   scene.js — hero 3D: «От изысканий до ключей».
   A residential quarter (the kind of project the company designs) is born the
   way every Promtech project is, as one continuous cycle:
     1. Изыскания       — a survey sweep lays a grid of points over the site
     2. Проектирование  — drawing lines trace every floor, column and core
     3. Строительство   — floors drop onto the drawing one by one, windows light
   then the quarter returns to the drawing and is built again.

   Interaction
     • the cursor is an engineer's section: a vertical cut through the quarter
       that reveals the structure inside (floors, columns, cores)
     • drag (mouse) turns the quarter, with inertia
     • click sends a survey pulse through the ground
     • scrolling away explodes the buildings floor by floor (axonometric)

   Techniques (CloudAI-X/threejs-skills): every floor of every building is one
   InstancedMesh, all drawing lines one LineSegments, the survey one Points →
   a handful of draw calls; ShaderMaterials end with the tonemapping and
   colorspace includes; no allocations inside the loop; pixel ratio capped;
   the loop pauses while the hero is off screen or the tab is hidden.
   ========================================================================== */
import * as THREE from "three";

const SITE = window.SITE_CONFIG || {};
const CFG = SITE.scene || {};
const canvas = document.getElementById("scene-canvas");
const hero = document.getElementById("home");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stillMode = /[?&]still/.test(location.search);
const isMobile = window.innerWidth < 760;

/* ---------- helpers ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const smooth = (t) => t * t * (3 - 2 * t);

/* Two looks: a night quarter (dark theme) and a white architectural
   maquette with navy drawing lines (light theme). */
const PALETTES = {
  dark: {
    body: "#17191d", slab: "#24272d", glass: "#0b0e14", lit: "#ffc673",
    line: "#D4A95C", accent: "#F1D7A0", point: "#D4A95C",
    blend: THREE.AdditiveBlending, lineOpacity: 0.9, dust: 0.5
  },
  light: {
    body: "#ecebe6", slab: "#ffffff", glass: "#b7c4d6", lit: "#8ca2c3",
    line: "#0D2150", accent: "#1B3F86", point: "#0D2150",
    blend: THREE.NormalBlending, lineOpacity: 0.75, dust: 0.2
  }
};

/* ---------- shaders ---------- */
const BODY_VERT = /* glsl */ `
  attribute vec4 aInfo;            // x: build order 0..1, y: floor, z: floors, w: seed
  uniform float uBuild;
  uniform float uExplode;
  varying vec3 vLocal;             // position inside the quarter (group space)
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec2 vFace;              // face coordinates in world units
  varying float vTop;              // 1 on slab faces (top / bottom)
  varying float vGrow;
  varying vec4 vInfo;

  float easeOutBack(float t) {
    float c1 = 1.70158; float c3 = c1 + 1.0;
    return 1.0 + c3 * pow(t - 1.0, 3.0) + c1 * pow(t - 1.0, 2.0);
  }

  void main() {
    float start = aInfo.x * 0.35 + (aInfo.y / aInfo.z) * 0.55;
    float g = clamp((uBuild - start) / 0.1, 0.0, 1.0);
    float gb = g <= 0.0 ? 0.0 : easeOutBack(g);
    vGrow = g;

    vec3 p = position * vec3(mix(0.7, 1.0, gb), gb, mix(0.7, 1.0, gb));
    vec4 inst = instanceMatrix * vec4(p, 1.0);
    inst.y += (1.0 - g) * 0.9 + uExplode * aInfo.y * 0.24;   // floors drop in; explode on scroll
    vLocal = inst.xyz;

    vec4 world = modelMatrix * inst;
    vWorld = world.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);

    vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vec3 lp = position * sc;
    if (abs(normal.y) > 0.5) { vFace = lp.xz; vTop = 1.0; }
    else if (abs(normal.x) > 0.5) { vFace = vec2(lp.z, lp.y); vTop = 0.0; }
    else { vFace = vec2(lp.x, lp.y); vTop = 0.0; }
    vInfo = aInfo;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BODY_FRAG = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uSlab;
  uniform vec3 uGlass;
  uniform vec3 uLit;
  uniform vec3 uAccent;
  uniform vec3 uCursor;
  uniform float uCursorOn;
  uniform float uRadius;
  uniform float uTime;
  uniform vec3 uLightDir;
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vN;
  varying vec2 vFace;
  varying float vTop;
  varying float vGrow;
  varying vec4 vInfo;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

  void main() {
    if (vGrow <= 0.001) discard;

    // the engineer's section: a vertical cylinder around the cursor is cut away
    float d = distance(vLocal.xz, uCursor.xz);
    float cut = uCursorOn * (1.0 - smoothstep(uRadius - 0.22, uRadius, d));
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (cut > 0.02 + dither * 0.96) discard;

    vec3 n = normalize(vN);
    float diff = 0.42 + 0.58 * max(dot(n, normalize(uLightDir)), 0.0);
    vec3 col;
    if (vTop > 0.5) {
      col = uSlab * diff;
    } else {
      float W = 0.26;
      float cellId = floor(vFace.x / W + 0.5);
      float cx = fract(vFace.x / W + 0.5);
      float win = step(0.2, cx) * step(cx, 0.8) * step(abs(vFace.y), 0.095);
      float r = hash(vec3(cellId, vInfo.y, vInfo.w + n.x * 3.0 + n.z * 7.0));
      float lit = step(0.5, r);
      lit *= 0.75 + 0.25 * sin(uTime * (0.6 + r * 1.4) + r * 40.0);   // lights breathe
      vec3 glass = mix(uGlass, uLit, lit);
      col = mix(uBody * diff, glass, win);
    }

    vec3 v = normalize(cameraPosition - vWorld);
    float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += uAccent * fr * 0.10;

    // a glowing rim where the section cuts the facade
    float ring = uCursorOn * (1.0 - smoothstep(0.0, 0.16, abs(d - uRadius)));
    col = mix(col, uAccent * 1.3, ring * 0.9);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const LINE_VERT = /* glsl */ `
  attribute vec4 aInfo;            // x: build order, y: floor, z: floors, w: kind (0 outline, 1 post, 2 interior)
  uniform float uDesign;
  uniform float uBuild;
  uniform float uExplode;
  varying float vDrawn;
  varying float vBuilt;
  varying float vKind;
  varying vec3 vLocal;

  void main() {
    float start = aInfo.x * 0.4 + (aInfo.y / aInfo.z) * 0.5;
    vDrawn = smoothstep(start, start + 0.1, uDesign);
    float bStart = aInfo.x * 0.35 + (aInfo.y / aInfo.z) * 0.55;
    vBuilt = clamp((uBuild - bStart) / 0.1, 0.0, 1.0);
    vKind = aInfo.w;

    vec3 p = position;
    p.y += uExplode * aInfo.y * 0.24;
    vLocal = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform vec3 uCursor;
  uniform float uCursorOn;
  uniform float uRadius;
  uniform float uOpacity;
  varying float vDrawn;
  varying float vBuilt;
  varying float vKind;
  varying vec3 vLocal;

  void main() {
    float d = distance(vLocal.xz, uCursor.xz);
    float inside = uCursorOn * (1.0 - smoothstep(uRadius - 0.3, uRadius, d));
    float interior = step(1.5, vKind);
    // outlines read as the drawing, fade back once floors stand; interior shows in the section
    float base = mix(mix(0.75, 0.32, vBuilt), 0.14 * (1.0 - vBuilt), interior);
    float a = vDrawn * (base + inside * mix(0.6, 1.0, interior));
    if (a < 0.003) discard;
    vec3 c = mix(uColor, uAccent, inside);
    gl_FragColor = vec4(c, a * uOpacity);
    #include <colorspace_fragment>
  }
`;

const POINT_VERT = /* glsl */ `
  uniform float uSurvey;
  uniform float uTime;
  uniform float uPixel;
  uniform float uCursorOn;
  uniform vec3 uCursor;
  uniform vec3 uClick;
  uniform float uClickT;
  varying float vA;
  varying float vHi;

  void main() {
    vec3 p = position;
    float r = length(p.xz);
    float sweep = uSurvey * 8.6;
    float appear = 1.0 - smoothstep(sweep - 1.2, sweep, r);

    float dc = distance(p.xz, uCursor.xz);
    float hover = uCursorOn * exp(-dc * 0.7);
    p.y += sin(dc * 5.0 - uTime * 3.0) * 0.07 * hover;

    float ct = uTime - uClickT;
    float dk = distance(p.xz, uClick.xz);
    float pulse = step(0.0, ct) * exp(-pow((dk - ct * 5.0) * 1.6, 2.0)) * exp(-ct * 0.8);
    p.y += pulse * 0.35;

    float front = (1.0 - smoothstep(0.0, 0.6, abs(r - sweep))) * (1.0 - step(0.999, uSurvey));
    vHi = clamp(hover * 0.8 + pulse + front, 0.0, 1.0);
    vA = appear * (1.0 - smoothstep(6.6, 8.3, r));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.5 + vHi * 2.4) * uPixel * (16.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uOpacity;
  varying float vA;
  varying float vHi;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float l = length(c);
    if (l > 0.5) discard;
    float a = vA * (0.32 + vHi * 0.68) * (1.0 - l * 1.4);
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uColor, uAccent, vHi), a * uOpacity);
    #include <colorspace_fragment>
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixel;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * aSpeed, 8.0);
    vA = smoothstep(0.0, 1.0, p.y) * (1.0 - smoothstep(6.0, 8.0, p.y));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 1.4 * uPixel * (16.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  void main() {
    float l = length(gl_PointCoord - 0.5);
    if (l > 0.5) discard;
    gl_FragColor = vec4(uColor, vA * uOpacity * (1.0 - l * 2.0));
    #include <colorspace_fragment>
  }
`;

function boot() {
  const FH = 0.32;                                   // floor height
  const rng = mulberry32(CFG.seed || 2014);

  /* ---------- renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const camTarget = new THREE.Vector3(0, 2.0, 0);
  const camBase = new THREE.Vector3();
  let camDist = 25;

  const world = new THREE.Group();                   // the quarter; drag turns it
  scene.add(world);

  /* ---------- shared uniforms ---------- */
  const U = {
    uTime: { value: 0 }, uBuild: { value: 0 }, uDesign: { value: 0 }, uSurvey: { value: 0 },
    uExplode: { value: 0 }, uCursor: { value: new THREE.Vector3(99, 0, 99) }, uCursorOn: { value: 0 },
    uRadius: { value: isMobile ? 1.3 : 1.6 }, uClick: { value: new THREE.Vector3(99, 0, 99) },
    uClickT: { value: -99 }, uPixel: { value: pixelRatio },
    uLightDir: { value: new THREE.Vector3(-0.5, 0.8, 0.45) },
    uBody: { value: new THREE.Color() }, uSlab: { value: new THREE.Color() }, uGlass: { value: new THREE.Color() },
    uLit: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() }
  };

  /* ---------- the quarter layout (seeded, so it is the same on every visit) ---------- */
  const lots = [];
  const CELL = 2.05;
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const cx = gx * CELL, cz = gz * CELL, r = Math.hypot(cx, cz);
      if (r > 4.7) continue;
      if ((gx === 1 && gz === 1) || (gx === -1 && gz === 0)) continue;   // courtyard + square
      if (r > 0.1 && rng() < 0.16) continue;
      const c = 1 - r / 5.2;
      const floors = r < 0.1 ? 20 : Math.round(3 + c * c * 12 + rng() * 5);
      lots.push({
        x: cx + (rng() - 0.5) * 0.25, z: cz + (rng() - 0.5) * 0.25,
        w: 1.15 + rng() * 0.5, d: 1.15 + rng() * 0.5, floors, r, seed: rng() * 10
      });
    }
  }
  lots.sort((a, b) => a.r - b.r);                      // built from the centre outwards
  lots.forEach((l, i) => { l.order = lots.length > 1 ? i / (lots.length - 1) : 0; });

  // podium under tall towers, a slimmer crown on top
  function footprint(l, f) {
    if (l.floors >= 12 && f < 2) return Math.min(1.25, 1.85 / Math.max(l.w, l.d));
    if (l.floors >= 9 && f >= Math.ceil(l.floors * 0.8)) return 0.82;
    return 1;
  }

  /* ---------- floors (one InstancedMesh) + drawing lines (one LineSegments) ---------- */
  const total = lots.reduce((s, l) => s + l.floors, 0);
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const info = new Float32Array(total * 4);
  const bodyMat = new THREE.ShaderMaterial({
    vertexShader: BODY_VERT, fragmentShader: BODY_FRAG,
    uniforms: {
      uBuild: U.uBuild, uExplode: U.uExplode, uBody: U.uBody, uSlab: U.uSlab, uGlass: U.uGlass,
      uLit: U.uLit, uAccent: U.uAccent, uCursor: U.uCursor, uCursorOn: U.uCursorOn,
      uRadius: U.uRadius, uTime: U.uTime, uLightDir: U.uLightDir
    }
  });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, total);
  bodies.frustumCulled = false;                      // floors move in the shader

  const lp = [], li = [];
  function seg(ax, ay, az, bx, by, bz, inf) {
    lp.push(ax, ay, az, bx, by, bz);
    li.push(inf[0], inf[1], inf[2], inf[3], inf[0], inf[1], inf[2], inf[3]);
  }
  function rect(x, z, hw, hd, y, inf) {
    seg(x - hw, y, z - hd, x + hw, y, z - hd, inf);
    seg(x + hw, y, z - hd, x + hw, y, z + hd, inf);
    seg(x + hw, y, z + hd, x - hw, y, z + hd, inf);
    seg(x - hw, y, z + hd, x - hw, y, z - hd, inf);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  let k = 0;
  lots.forEach((l) => {
    for (let f = 0; f < l.floors; f++) {
      const s = footprint(l, f), w = l.w * s, d = l.d * s;
      pv.set(l.x, (f + 0.5) * FH, l.z);
      sv.set(w * 0.96, FH * 0.92, d * 0.96);
      m4.compose(pv, q, sv);
      bodies.setMatrixAt(k, m4);
      info[k * 4] = l.order; info[k * 4 + 1] = f; info[k * 4 + 2] = l.floors; info[k * 4 + 3] = l.seed;
      k++;

      const y0 = f * FH, y1 = (f + 1) * FH, hw = w / 2, hd = d / 2;
      const outline = [l.order, f, l.floors, 0], post = [l.order, f, l.floors, 1], inner = [l.order, f, l.floors, 2];
      rect(l.x, l.z, hw, hd, y0, outline);
      if (f === l.floors - 1) rect(l.x, l.z, hw, hd, y1, outline);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        seg(l.x + sx * hw, y0, l.z + sz * hd, l.x + sx * hw, y1, l.z + sz * hd, post);
        seg(l.x + sx * hw * 0.5, y0, l.z + sz * hd * 0.5, l.x + sx * hw * 0.5, y1, l.z + sz * hd * 0.5, inner);
      }
      rect(l.x, l.z, hw * 0.22, hd * 0.22, y0, inner);           // the core
    }
  });
  bodyGeo.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
  bodies.instanceMatrix.needsUpdate = true;
  world.add(bodies);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  lineGeo.setAttribute("aInfo", new THREE.Float32BufferAttribute(li, 4));
  const lineMat = new THREE.ShaderMaterial({
    vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false,
    uniforms: {
      uDesign: U.uDesign, uBuild: U.uBuild, uExplode: U.uExplode, uCursor: U.uCursor,
      uCursorOn: U.uCursorOn, uRadius: U.uRadius, uColor: { value: new THREE.Color() },
      uAccent: U.uAccent, uOpacity: { value: 1 }
    }
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  world.add(lines);

  /* ---------- survey: ground point grid, contours, sweep ring, dust ---------- */
  const STEP = isMobile ? 0.4 : 0.3, GR = 8.2, gp = [];
  for (let x = -GR; x <= GR; x += STEP) {
    for (let z = -GR; z <= GR; z += STEP) if (Math.hypot(x, z) <= GR) gp.push(x, 0, z);
  }
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
  const pointMat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false,
    uniforms: {
      uSurvey: U.uSurvey, uTime: U.uTime, uPixel: U.uPixel, uCursorOn: U.uCursorOn, uCursor: U.uCursor,
      uClick: U.uClick, uClickT: U.uClickT, uColor: { value: new THREE.Color() }, uAccent: U.uAccent,
      uOpacity: { value: 1 }
    }
  });
  const points = new THREE.Points(pointGeo, pointMat);
  points.frustumCulled = false;
  world.add(points);

  function circle(r, n) {
    const a = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; a.push(Math.cos(t) * r, 0, Math.sin(t) * r); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
    return g;
  }
  const contourMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  [5.6, 6.6, 7.6].forEach((r) => world.add(new THREE.LineLoop(circle(r, 128), contourMat)));
  const sweepMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const sweep = new THREE.LineLoop(circle(1, 128), sweepMat);
  sweep.position.y = 0.01;
  world.add(sweep);

  const DUST = isMobile ? 70 : 150, dp = new Float32Array(DUST * 3), ds = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 7.5;
    dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = rng() * 8; dp[i * 3 + 2] = Math.sin(a) * r;
    ds[i] = 0.08 + rng() * 0.22;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  dustGeo.setAttribute("aSpeed", new THREE.BufferAttribute(ds, 1));
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: U.uTime, uPixel: U.uPixel, uColor: { value: new THREE.Color() }, uOpacity: { value: 0.5 } }
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  world.add(dust);

  /* ---------- theme ---------- */
  let looping = false;
  function applyTheme(c) {
    const bg = new THREE.Color((c && c.bg) || "#000000");
    const lightBg = 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b > 0.5;
    const P = lightBg ? PALETTES.light : PALETTES.dark;
    renderer.setClearColor(bg, 1);
    U.uBody.value.set(P.body); U.uSlab.value.set(P.slab); U.uGlass.value.set(P.glass);
    U.uLit.value.set(P.lit); U.uAccent.value.set(P.accent);
    lineMat.uniforms.uColor.value.set(P.line);
    lineMat.uniforms.uOpacity.value = P.lineOpacity;
    pointMat.uniforms.uColor.value.set(P.point);
    dustMat.uniforms.uColor.value.set(P.point);
    dustMat.uniforms.uOpacity.value = P.dust;
    contourMat.color.set(P.line); sweepMat.color.set(P.accent);
    [lineMat, pointMat, dustMat].forEach((mt) => {
      if (mt.blending !== P.blend) { mt.blending = P.blend; mt.needsUpdate = true; }
    });
    if (!looping) render();
  }

  /* ---------- framing: the quarter sits to the right of the hero copy ---------- */
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const aspect = W / H;
    if (aspect > 1.05) {
      camDist = aspect > 1.5 ? 28.5 : 32;
      camera.setViewOffset(W, H, -W * (aspect > 1.5 ? 0.3 : 0.26), H * 0.03, W, H);
    } else {
      camDist = 36;
      camera.setViewOffset(W, H, 0, -H * 0.2, W, H);           // lower half on phones
    }
    const el = 0.42;                                             // camera elevation (rad)
    camBase.set(0, camTarget.y + Math.sin(el) * camDist, Math.cos(el) * camDist);
    camera.updateProjectionMatrix();
    if (!looping) render();
  }

  /* ---------- interaction ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.0);   // cut follows the cursor at mid height
  const hit = new THREE.Vector3();
  const cursorTarget = new THREE.Vector3(99, 0, 99);
  let cursorOnTarget = 0, mx = 0, my = 0;
  let dragging = false, downX = 0, downY = 0, lastX = 0, rotY = -0.5, vel = 0;

  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    if (clientY < r.top || clientY > r.bottom || clientX < r.left || clientX > r.right) return false;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return false;
    world.worldToLocal(hit);
    return Math.hypot(hit.x, hit.z) < 7.2;
  }

  function onMove(e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    const over = !e.target.closest || !e.target.closest("a, button, .nav");
    if (over && pick(e.clientX, e.clientY)) { cursorTarget.copy(hit); cursorOnTarget = 1; }
    else cursorOnTarget = 0;
    if (dragging) { const dx = e.clientX - lastX; rotY += dx * 0.006; vel = dx * 0.006; lastX = e.clientX; }
  }
  function onDown(e) {
    downX = e.clientX; downY = e.clientY;
    if (e.pointerType === "touch") { onMove(e); return; }       // touch: section + pulse, page still scrolls
    dragging = true; lastX = e.clientX; vel = 0;
    canvas.style.cursor = "grabbing";
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onUp(e) {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 5 && pick(e.clientX, e.clientY)) {
      U.uClick.value.copy(hit); U.uClickT.value = U.uTime.value;   // survey pulse
    }
    if (e.pointerType === "touch") cursorOnTarget = 0;
    dragging = false; canvas.style.cursor = "grab";
  }

  if (!reduce) {
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", () => { cursorOnTarget = 0; });
  }

  /* ---------- the cycle: survey → design → build → hold → back to the drawing ---------- */
  const CYCLE = Math.max(10, CFG.cycleSeconds || 15);
  const hud = Array.prototype.slice.call(document.querySelectorAll("#hero-process li"));
  let stage = -1;
  function timeline(t) {
    U.uSurvey.value = smooth(clamp01(t / 2.0));
    U.uDesign.value = clamp01((t - 1.3) / 3.0);
    let b = 0, s = t < 1.8 ? 0 : 1;
    if (t >= 4.0) {
      const hold = CYCLE - 6.5, ph = (t - 4.0) % CYCLE;
      if (ph < 4) { b = ph / 4; s = 2; }
      else if (ph < 4 + hold) { b = 1; s = 2; }
      else if (ph < 6 + hold) { b = 1 - (ph - 4 - hold) / 2; s = 1; }
      else { b = 0; s = 1; }
    }
    U.uBuild.value = b;
    if (hud.length) {
      if (s !== stage) { stage = s; hud.forEach((li, i) => li.classList.toggle("is-active", i === s)); }
      hud[0] && hud[0].style.setProperty("--p", U.uSurvey.value.toFixed(3));
      hud[1] && hud[1].style.setProperty("--p", U.uDesign.value.toFixed(3));
      hud[2] && hud[2].style.setProperty("--p", b.toFixed(3));
    }
  }

  /* ---------- loop ---------- */
  const AUTO = CFG.autoRotate === false ? 0 : (CFG.rotateSpeed || 0.05);
  const EXPLODE = CFG.explodeOnScroll !== false;
  let last = 0, t = 0;

  const camOff = new THREE.Vector3();               // mouse parallax
  function render() {
    world.rotation.y = rotY;
    camera.position.copy(camBase).add(camOff);
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now; t += dt;
    U.uTime.value = t;
    timeline(t);

    if (!dragging) { rotY += AUTO * dt + vel; vel *= 0.93; }
    U.uCursor.value.lerp(cursorTarget, 0.2);
    U.uCursorOn.value += (cursorOnTarget - U.uCursorOn.value) * 0.12;

    const hh = hero ? hero.offsetHeight : H;
    const p = EXPLODE ? clamp01(window.scrollY / (hh * 0.85)) : 0;
    U.uExplode.value = smooth(p);

    const s = U.uSurvey.value;
    sweep.scale.setScalar(Math.max(0.01, s * 8.6));
    sweepMat.opacity = s < 1 ? 0.8 * (1 - s) + 0.1 : 0;
    contourMat.opacity = 0.16 * s;

    camOff.x += (mx * 0.9 - camOff.x) * 0.05;
    camOff.y += (-my * 0.6 - camOff.y) * 0.05;
    render();
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  const css = getComputedStyle(document.documentElement);
  applyTheme({ bg: css.getPropertyValue("--bg").trim() || "#000000" });

  if (reduce || stillMode) {
    // finished quarter, no motion
    U.uSurvey.value = U.uDesign.value = U.uBuild.value = 1;
    hud.forEach((li, i) => { li.classList.toggle("is-active", i === 2); li.style.setProperty("--p", "1"); });
    render();
  } else {
    let visible = true;
    const sync = () => {
      const on = visible && !document.hidden;
      if (on === looping) return;
      looping = on; last = 0;
      renderer.setAnimationLoop(on ? frame : null);
    };
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; sync(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", sync);
    sync();
  }

  document.documentElement.classList.add("scene-ready");
  window.__SCENE = { scene, camera, renderer, world, uniforms: U, applyTheme, render };
  window.__sceneInfo = () => ({ floors: total, buildings: lots.length, calls: renderer.info.render.calls });
}

/* start (after every constant above is initialised) */
if (canvas && CFG.enabled !== false) {
  try { boot(); }
  catch (e) { console.warn("[scene] disabled:", e); canvas.style.display = "none"; }
}
