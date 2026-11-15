/* =============================================================================
   scene-building.js — «Допуск к высоте»: hero scene of the licenses page.

   A twisting high-rise (40 floors, gold slab edges, vertical fins, glass with
   per-window lighting) is assembled floor by floor on a blueprint compass.
   Then a gold inspection beam sweeps up the facade, the windows light up
   behind it and a seal ring spreads from the base — every floor admitted.
   The beam returns every few seconds; drag rotates the tower.

   Same performance rules as the home scene (scene.js):
     • one InstancedMesh per part (4 draw calls for 40 floors), the build-in
       motion runs in the vertex shader — no per-frame matrix updates
     • no allocations in the frame loop; DPR cap (lower on Safari / iOS)
       + adaptive resolution; same-size resizes skipped (iOS toolbar)
     • renders only while on screen and the tab is visible
     • reduced motion / ?still → one finished frame
   No day/night: the scene follows the site theme (window.__BUILDING.applyTheme).
   ========================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const canvas = document.getElementById("building-canvas");
const wrap = canvas && canvas.parentElement;
const CFG = ((window.SITE_CONFIG || {}).licenses || {}).scene || {};
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stillMode = /[?&]still/.test(location.search);
const isMobile = window.innerWidth < 760;
const isWebKit = document.documentElement.classList.contains("is-webkit");

/* ---------- tower dimensions (world units) ---------- */
const N = 40, FH = 0.3, SLAB = 0.06, R = 1.3, FINS = 12, SQ = 5.5;
const TOWER_H = N * FH;                       // 12
const CROWN_H = 3.6;                          // lantern + spire
const TOP = TOWER_H + CROWN_H;
const STAGGER = 0.07, LAND = 0.65;            // build-in timing per floor (s)
const BUILD_AT = 0.5, BUILD_END = BUILD_AT + (N - 1) * STAGGER + LAND;
const CROWN_AT = BUILD_END - 0.2, CROWN_DUR = 0.9;
const SCAN_AT = CROWN_AT + CROWN_DUR + 0.2, SCAN_DUR = 2.4, SCAN_EVERY = 10;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// floor i: twist, taper and a slight belly
const twistOf = (i) => (i / (N - 1)) * 1.45;
const scaleOf = (i) => { const t = i / (N - 1); return 1 - 0.3 * Math.pow(t, 1.6) + 0.05 * Math.sin(t * Math.PI); };


/* superellipse footprint (soft square) */
function footprint(r, n = SQ, seg = 72) {
  const pts = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pts.push(new THREE.Vector2(r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), r * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)));
  }
  return pts;
}
// extrude a footprint (with optional hole) upwards: y from y0 to y0 + h
function prism(outer, h, y0, hole) {
  const shape = new THREE.Shape(outer);
  if (hole) shape.holes.push(new THREE.Path(hole.slice().reverse()));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);                 // extrusion now runs along +y
  g.translate(0, y0, 0);
  return g;
}

/* build-in motion, shared by every floor material (vertex shader) */
const BUILD_GLSL = /* glsl */`
  attribute float aFloor;
  uniform float uBuild;
  float buildE(float f) { return clamp((uBuild - f * ${STAGGER.toFixed(3)}) / ${LAND.toFixed(3)}, 0.0, 1.0); }
  vec3 buildPos(vec3 p, float f) {
    float e = buildE(f);
    if (e <= 0.0) return vec3(0.0);
    float o = 1.0 - e, eo = 1.0 - o * o * o;
    p.xz *= mix(1.22, 1.0, eo);            // a floor lands slightly wide, then settles
    p.y += o * o * 2.4;                    // and drops in from above
    return p;
  }
`;

function boot() {
  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const dpr = window.devicePixelRatio || 1;
  let pixelRatio = Math.min(dpr, isWebKit ? (isMobile ? 1.25 : 1.35) : (isMobile ? 1.5 : 1.75));
  const minRatio = Math.min(dpr, 1);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const world = new THREE.Group();          // turns (auto + drag)
  scene.add(world);

  const hemi = new THREE.HemisphereLight(0xfff1dc, 0x15120e, 0.7);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-6, 12, 9);
  const rim = new THREE.DirectionalLight(0xffd59a, 1.2); rim.position.set(7, 6, -9);
  scene.add(hemi, key, rim);

  /* ---------- shared uniforms ---------- */
  const U = {
    build: { value: reduce || stillMode ? 99 : 0 },
    time: { value: 0 },
    scan: { value: -9 }, scanA: { value: 0 },
    litH: { value: reduce || stillMode ? 99 : -9 },
    lit: { value: 0.5 },
    pixel: { value: pixelRatio }
  };
  function patch(mat) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uBuild = U.build;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\n" + BUILD_GLSL)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed = buildPos(transformed, aFloor);");
    };
    return mat;
  }

  /* ---------- floor geometries ---------- */
  const fp = footprint(R);
  const fpEdgeOut = footprint(R * 1.062), fpEdgeIn = footprint(R * 1.04);
  const gSlab = prism(footprint(R * 1.05), SLAB, 0);
  const gEdge = prism(fpEdgeOut, 0.014, SLAB - 0.014, fpEdgeIn);
  const gGlass = prism(fp, FH - SLAB, SLAB);
  // vertical fins on the slab edge, merged into one geometry per floor
  const fins = [];
  for (let k = 0; k < FINS; k++) {
    const a = ((k + 0.5) / FINS) * Math.PI * 2;
    const p = footprintPoint(R * 1.04, a), q = footprintPoint(R * 1.04, a + 0.01);
    const b = new THREE.BoxGeometry(0.028, FH - SLAB, 0.11);
    b.rotateY(Math.atan2(q.y - p.y, q.x - p.x));           // thin side along the facade, depth outwards
    b.translate(p.x, SLAB + (FH - SLAB) / 2, -p.y);         // shape y → world -z (rotateX above)
    fins.push(b);
  }
  const gFins = mergeGeometries(fins);
  fins.forEach((b) => b.dispose());

  function footprintPoint(r, a, n = SQ) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y: r * Math.sign(s) * Math.pow(Math.abs(s), 2 / n) };
  }

  const floorIdx = new Float32Array(N).map((_, i) => i);
  [gSlab, gEdge, gGlass, gFins].forEach((g) => g.setAttribute("aFloor", new THREE.InstancedBufferAttribute(floorIdx, 1)));

  /* ---------- materials ---------- */
  const matSlab = patch(new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.7, metalness: 0.2, envMapIntensity: 0.5 }));
  const matGold = patch(new THREE.MeshStandardMaterial({ color: 0xd4a95c, roughness: 0.28, metalness: 1, envMapIntensity: 1.2 }));
  const matFin = patch(new THREE.MeshStandardMaterial({ color: 0x7d6240, roughness: 0.45, metalness: 0.8, envMapIntensity: 0.8 }));

  const GU = {
    uBuild: U.build, uTime: U.time, uScan: U.scan, uScanA: U.scanA, uLitH: U.litH, uLit: U.lit,
    uSkyLo: { value: new THREE.Color() }, uSkyHi: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uInner: { value: new THREE.Color() }, uFrame: { value: new THREE.Color() }, uLitCol: { value: new THREE.Color("#ffcf8f") },
    uGold: { value: new THREE.Color("#e9b866") }
  };
  const matGlass = new THREE.ShaderMaterial({
    uniforms: GU,
    vertexShader: /* glsl */`
      ${BUILD_GLSL}
      varying vec3 vLocal, vN, vW;
      varying float vFloor, vE;
      void main() {
        vE = buildE(aFloor); vFloor = aFloor; vLocal = position;
        vec3 p = buildPos(position, aFloor);
        mat4 im = instanceMatrix;
        vec4 w = modelMatrix * im * vec4(p, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uScan, uScanA, uLitH, uLit;
      uniform vec3 uSkyLo, uSkyHi, uHorizon, uInner, uFrame, uLitCol, uGold;
      varying vec3 vLocal, vN, vW;
      varying float vFloor, vE;
      float h1(float n) { return fract(sin(mod(n, 289.0)) * 43758.5453); }
      void main() {
        vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
        float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 Rf = reflect(-V, N);
        vec3 refl = mix(uSkyLo, uSkyHi, smoothstep(-0.25, 0.85, Rf.y)) + uHorizon * exp(-abs(Rf.y) * 7.0);
        // window cells around the floor: 28 bays, mullions + spandrels
        float a = atan(vLocal.z, vLocal.x) / 6.2831853 + 0.5;
        float u = a * 24.0, cell = floor(u), fu = fract(u);
        float fl = floor(vFloor + 0.5);
        float v = (vLocal.y - ${SLAB.toFixed(3)}) / ${(FH - SLAB).toFixed(3)};
        float frame = max(1.0 - step(0.07, fu) * step(fu, 0.93), 1.0 - step(0.06, v) * step(v, 0.95));
        frame *= step(abs(N.y), 0.5);                       // no grid on the caps
        float h = h1(fl * 9.17 + cell * 1.33);
        float flick = h1(fl * 7.13 + cell * 3.71 + floor(uTime * 0.06 + h * 11.0) * 5.31);
        float lit = step(flick, uLit) * step(vW.y, uLitH) * step(0.999, vE);
        // lit rooms: uneven brightness, warm to neutral, brighter towards the ceiling
        float glow = 0.18 + 0.75 * h * h;
        vec3 room = uLitCol * mix(vec3(1.0), vec3(0.85, 0.92, 1.05), step(0.7, fract(h * 7.0))) * glow;
        room *= 0.55 + 0.45 * smoothstep(0.1, 0.9, v);
        vec3 inner = mix(uInner, room, lit) * (0.75 + 0.25 * sin(v * 3.14159));
        vec3 col = mix(inner, refl, clamp(0.38 + 0.62 * f, 0.0, 1.0) * (1.0 - lit * 0.4));
        col = mix(col, uFrame, frame * 0.85);
        // inspection beam + the floors it just passed glow gold for a moment
        float band = exp(-pow((vW.y - uScan) * 5.0, 2.0));
        float trail = smoothstep(uScan - 1.6, uScan, vW.y) * step(vW.y, uScan);
        col += uGold * uScanA * (band * (0.9 + f) + trail * 0.12);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });

  /* ---------- the tower: 4 instanced meshes, one instance per floor ---------- */
  const tower = new THREE.Group();
  world.add(tower);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
  const parts = [[gGlass, matGlass], [gSlab, matSlab], [gEdge, matGold], [gFins, matFin]].map(([g, m]) => {
    const im = new THREE.InstancedMesh(g, m, N);
    im.frustumCulled = false;                               // the shader moves floors around
    tower.add(im);
    return im;
  });
  for (let i = 0; i < N; i++) {
    const s = scaleOf(i);
    m4.compose(v3.set(0, i * FH, 0), q4.setFromAxisAngle(yAxis, twistOf(i)), s3.set(s, 1, s));
    parts.forEach((im) => im.setMatrixAt(i, m4));
  }
  parts.forEach((im) => { im.instanceMatrix.needsUpdate = true; });

  /* ---------- crown: roof, lantern of gold columns, spire, aviation light ---------- */
  const crown = new THREE.Group();
  const sTop = scaleOf(N - 1), twTop = twistOf(N - 1);
  crown.rotation.y = twTop;
  const matRoof = new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.7, metalness: 0.2, envMapIntensity: 0.5 });
  const roof = new THREE.Mesh(prism(footprint(R * 1.05 * sTop), 0.1, 0), matRoof);
  crown.add(roof);
  const colG = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6); colG.translate(0, 0.65, 0);
  const cols = new THREE.InstancedMesh(colG, matGold, 16);
  for (let k = 0; k < 16; k++) {
    const p = footprintPoint(R * 0.72 * sTop, (k / 16) * Math.PI * 2);
    cols.setMatrixAt(k, m4.makeTranslation(p.x, 0, -p.y));
  }
  crown.add(cols);
  const ring = new THREE.Mesh(prism(footprint(R * 0.8 * sTop), 0.06, 1.2, footprint(R * 0.64 * sTop)), matGold);
  crown.add(ring);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.09, 2.4, 10).translate(0, 2.4, 0), matGold);
  crown.add(spire);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false }));
  beacon.position.y = 3.62;
  crown.add(beacon);
  crown.position.y = TOWER_H;
  world.add(crown);

  /* ---------- blueprint compass on the ground + seal ring ---------- */
  const GR = 6;
  const groundU = {
    uGrow: { value: reduce || stillMode ? 1 : 0 }, uPulse: { value: 0 }, uPulseA: { value: 0 },
    uGold: GU.uGold, uShadow: { value: new THREE.Color(0x000000) }, uShadowA: { value: 0.25 }, uLineA: { value: 0.5 }
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GR * 2, GR * 2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: groundU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uGrow, uPulse, uPulseA, uShadowA, uLineA;
      uniform vec3 uGold, uShadow;
      varying vec2 vP;
      float line(float d, float w) { float fw = fwidth(d); return 1.0 - smoothstep(w, w + fw * 1.5, abs(d)); }
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x);
        float reach = uGrow * ${GR.toFixed(1)};
        float rings = line(fract(r / 0.75 + 0.5) - 0.5, 0.012) * step(1.6, r);
        float ticks = line((fract(a / 6.2831853 * 72.0 + 0.5) - 0.5) * r * 0.087, 0.008) * step(4.1, r) * step(r, 4.45);
        float spokes = line((fract(a / 6.2831853 * 8.0 + 0.5) - 0.5) * r * 0.785, 0.006) * step(1.7, r);
        float lines = (rings * 0.55 + ticks * 0.9 + spokes * 0.25) * step(r, reach) * (1.0 - smoothstep(3.6, ${GR.toFixed(1)}, r));
        float seal = exp(-pow((r - uPulse) * 6.0, 2.0)) * uPulseA;
        float la = clamp((lines + seal * 1.4) * uLineA, 0.0, 1.0);
        float sh = exp(-r * r * 0.35) * uShadowA * uGrow;
        float alpha = la + sh * (1.0 - la);
        vec3 col = alpha > 0.0 ? mix(uShadow, uGold, la / alpha) : uGold;
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`
  }));
  ground.renderOrder = -1;
  world.add(ground);

  /* ---------- inspection halo that rides the beam ---------- */
  const haloU = { uA: U.scanA, uGold: GU.uGold };
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5, 5).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: haloU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uA; uniform vec3 uGold; varying vec2 vP;
      void main() {
        float r = length(vP);
        float g = exp(-pow((r - 1.45) * 3.2, 2.0)) * 0.9 + exp(-pow((r - 1.45) * 14.0, 2.0));
        gl_FragColor = vec4(uGold * g * uA, 1.0);
      }`
  }));
  world.add(halo);

  /* ---------- gold dust rising around the tower ---------- */
  const DUST = isMobile ? 70 : 140;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let k = 0; k < DUST; k++) {
    const a = Math.random() * Math.PI * 2, r = 1.9 + Math.random() * 2.6;
    dPos[k * 3] = Math.cos(a) * r; dPos[k * 3 + 1] = Math.random() * TOP; dPos[k * 3 + 2] = Math.sin(a) * r;
    dSeed[k] = Math.random();
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute("aSeed", new THREE.BufferAttribute(dSeed, 1));
  const dustU = { uTime: U.time, uPixel: U.pixel, uGold: GU.uGold, uA: { value: 0.8 }, uGrow: groundU.uGrow };
  const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({
    uniforms: dustU, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uPixel; varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.12 + aSeed * 0.25), ${TOP.toFixed(1)});
        p.x += sin(uTime * 0.4 + aSeed * 20.0) * 0.15;
        vA = smoothstep(0.0, 1.5, p.y) * (1.0 - smoothstep(${(TOP - 3).toFixed(1)}, ${TOP.toFixed(1)}, p.y)) * (0.4 + 0.6 * aSeed);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aSeed * 2.5) * uPixel * (30.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uGold; uniform float uA, uGrow; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(uGold, smoothstep(0.5, 0.0, d) * vA * uA * uGrow);
        #include <colorspace_fragment>
      }`
  }));
  world.add(dust);

  /* ---------- HUD chip (bottom left of the visual) ---------- */
  const T = Object.assign({
    building: "Монтаж · этаж {n} из {max}",
    checking: "Проверка допуска · этаж {n} из {max}",
    done: "Допуск подтверждён · {max} этажей",
    hint: "Потяните, чтобы повернуть"
  }, CFG);
  let chipText = null;
  if (wrap) {
    const chip = document.createElement("div");
    chip.className = "bld-chip";
    chip.innerHTML = '<span class="hl-pulse" aria-hidden="true"></span><span class="bld-status"></span>';
    wrap.appendChild(chip);
    chipText = chip.querySelector(".bld-status");
    if (!reduce && !stillMode) {
      const hint = document.createElement("p");
      hint.className = "bld-hint";
      hint.textContent = T.hint;
      wrap.appendChild(hint);
    }
  }
  let chipLast = "";
  function setChip(tpl, n) {
    if (!chipText) return;
    const s = tpl.replace("{n}", n).replace("{max}", N);
    if (s !== chipLast) { chipText.textContent = s; chipLast = s; }
  }

  /* ---------- theme (no day / night: the scene follows the site theme) ---------- */
  function applyTheme() {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    if (light) {
      GU.uSkyLo.value.set("#7d8794"); GU.uSkyHi.value.set("#eef3f8"); GU.uHorizon.value.set("#6a5434");
      GU.uInner.value.set("#2f3742"); GU.uFrame.value.set("#e7e3dc");
      U.lit.value = 0.22;
      matSlab.color.set("#ebe9e4"); matRoof.color.set("#ebe9e4");
      groundU.uShadow.value.set("#3a3328"); groundU.uShadowA.value = 0.32; groundU.uLineA.value = 0.75;
      dustU.uA.value = 0.55; hemi.intensity = 1.1;
    } else {
      GU.uSkyLo.value.set("#07080b"); GU.uSkyHi.value.set("#36404f"); GU.uHorizon.value.set("#3d2f1c");
      GU.uInner.value.set("#05070b"); GU.uFrame.value.set("#121418");
      U.lit.value = 0.3;
      matSlab.color.set("#1d1c1a"); matRoof.color.set("#1d1c1a");
      groundU.uShadow.value.set("#000000"); groundU.uShadowA.value = 0.5; groundU.uLineA.value = 0.5;
      dustU.uA.value = 0.85; hemi.intensity = 0.7;
    }
    if (!looping) render();
  }

  /* ---------- drag to rotate (horizontal; vertical swipes still scroll) ---------- */
  let yaw = -0.5, yawVel = 0, drag = null;
  let tiltT = 0, tilt = 0;
  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, id: e.pointerId }; yawVel = 0; });
  window.addEventListener("pointermove", (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      yawVel = dx * 0.006; yaw += yawVel;
      if (!looping) { world.rotation.y = yaw; render(); }
    } else if (e.pointerType === "mouse") {
      tiltT = (e.clientY / window.innerHeight - 0.5) * 0.06;
    }
  }, { passive: true });
  const endDrag = () => { drag = null; };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  /* ---------- framing ---------- */
  let W = 1, H = 1, sizedW = 0, sizedH = 0, sizedR = 0, fitDist = 40;
  const camTarget = new THREE.Vector3();
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    if (W === sizedW && H === sizedH && pixelRatio === sizedR) return;   // iOS toolbar resizes
    sizedW = W; sizedH = H; sizedR = pixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    fitDist = Math.max((TOP * 0.55) / tanV, 3.6 / (tanV * camera.aspect));
    if (!looping) render();
  }

  function render() { renderer.render(scene, camera); }

  /* ---------- timeline ---------- */
  let t = 0, last = 0, looping = false, nextScan = SCAN_AT, scanStart = -99, firstScanDone = false;
  function place(dt) {
    // build-in
    U.build.value = Math.max(U.build.value, t - BUILD_AT);
    groundU.uGrow.value = reduce || stillMode ? 1 : easeOut(clamp01(t / 1.4));
    const ce = reduce || stillMode ? 1 : easeOut(clamp01((t - CROWN_AT) / CROWN_DUR));
    crown.visible = ce > 0;
    crown.position.y = TOWER_H + (1 - ce) * (1 - ce) * 2.4;
    crown.scale.setScalar(0.85 + 0.15 * ce);

    // inspection beam: first sweep turns the lights on, later ones just pass
    if (!reduce && !stillMode && t >= nextScan) { scanStart = t; nextScan = t + SCAN_DUR + SCAN_EVERY; }
    const sp = (t - scanStart) / SCAN_DUR;
    if (sp >= 0 && sp <= 1.25) {
      const k = easeInOut(clamp01(sp));
      U.scan.value = -0.3 + k * (TOWER_H + 0.6);
      U.scanA.value = smooth(0, 0.08, sp) * (1 - smooth(1, 1.25, sp));
      if (!firstScanDone) U.litH.value = U.scan.value;
      halo.position.y = U.scan.value;
      const fl = Math.min(N - 1, Math.max(0, Math.round(U.scan.value / FH)));
      halo.scale.setScalar(scaleOf(fl) * 1.02);
      halo.rotation.y = twistOf(fl);
      halo.visible = true;
      setChip(T.checking, Math.min(N, Math.max(1, Math.round(U.scan.value / FH))));
      if (sp >= 1) firstScanDone = true;
    } else {
      halo.visible = false; U.scanA.value = 0;
      if (firstScanDone || reduce || stillMode) { U.litH.value = 99; setChip(T.done, N); }
      else setChip(T.building, Math.min(N, Math.max(1, Math.floor((U.build.value - LAND * 0.5) / STAGGER) + 1)));
    }
    // seal ring spreads from the base as each sweep reaches the top
    const pp = (t - scanStart - SCAN_DUR * 0.95) / 1.8;
    if (pp >= 0 && pp <= 1) { groundU.uPulse.value = 1.5 + easeOut(pp) * 4.2; groundU.uPulseA.value = 1 - pp; }
    else groundU.uPulseA.value = 0;

    // aviation light blinks once the crown is up
    beacon.visible = ce >= 1 && (reduce || stillMode || (t % 1.6) < 0.25);

    // turn: slow auto rotation + drag with inertia
    if (!drag) { yaw += yawVel; yawVel *= Math.pow(0.04, dt); yaw += dt * 0.07 * (1 - Math.min(1, Math.abs(yawVel) * 40)); }
    world.rotation.y = yaw;

    // camera: starts low at the base looking up, rises with the floors, settles
    const settle = reduce || stillMode ? 1 : smooth(BUILD_AT + 0.6, SCAN_AT + 0.5, t);
    const buildTop = Math.min(TOWER_H, Math.max(0, (U.build.value / STAGGER) * FH));
    const ty = THREE.MathUtils.lerp(buildTop * 0.55 + 1.2, TOP * 0.47, settle);
    const dist = fitDist * THREE.MathUtils.lerp(0.62, 1, settle);
    tilt += (tiltT - tilt) * Math.min(1, dt * 3);
    camTarget.set(0, ty, 0);
    camera.position.set(0, ty * 0.42 + 0.4 + tilt * dist, dist);
    camera.lookAt(camTarget);
  }

  // adaptive resolution (same rule as the home scene)
  let perfSum = 0, perfN = 0;
  function adapt(raw) {
    if (raw <= 0 || raw > 0.25 || t < 3) return;
    perfSum += raw; perfN++;
    if (perfN < 90) return;
    const avg = perfSum / perfN; perfSum = 0; perfN = 0;
    if (avg > 1 / 40 && pixelRatio > minRatio) {
      pixelRatio = Math.max(minRatio, Math.round((pixelRatio - 0.25) * 100) / 100);
      U.pixel.value = pixelRatio;
      resize();
    }
  }

  function frame(now) {
    const raw = last ? (now - last) / 1000 : 0.016;
    const dt = Math.min(raw, 0.05);
    last = now; t += dt;
    adapt(raw);
    U.time.value = t;
    place(dt);
    render();
  }

  window.addEventListener("resize", resize, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();
  applyTheme();

  if (reduce || stillMode) {
    t = SCAN_AT + 40; U.time.value = 3; place(0.016); render();
  } else {
    let visible = false;
    const sync = () => {
      const on = visible && !document.hidden;
      if (on === looping) return;
      looping = on; last = 0;
      renderer.setAnimationLoop(on ? frame : null);
    };
    // the build starts the first time the visual is on screen
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; sync(); }, { rootMargin: "60px 0px" }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
    place(0); render();
  }

  window.__BUILDING = {
    applyTheme, scene, renderer, uniforms: U,
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, ratio: pixelRatio, t: t.toFixed(2) })
  };
}

// boot last: every module-level const above is initialised by now
if (canvas) {
  try { boot(); }
  catch (e) { console.warn("[building] disabled:", e); canvas.style.display = "none"; }
}
