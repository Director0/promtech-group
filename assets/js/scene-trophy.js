/* =============================================================================
   scene-trophy.js — «Награда за полный цикл»: hero scene of the specs page.

   An octagonal marble plinth rises. Four gold rings — the four stages of the
   header checklist (survey → design → construction → handover) — orbit it and
   lock one by one into the stem; each lock ticks its checklist item. Then a
   cut-crystal gold cup grows out of the stem, a star settles above it, light
   pours out of the cup and sparks burst. Afterwards the trophy turns slowly,
   a glint sweeps its facets and the celebration repeats now and then.
   Drag rotates it.

   Same performance rules as the home scene (scene.js) and the licenses tower:
   a handful of meshes, motion in shaders where it is per particle, no
   allocations in the loop, DPR cap (lower on Safari / iOS) + adaptive
   resolution, same-size resizes skipped, renders only while visible,
   reduced motion / ?still → one finished frame. No day / night: the scene
   follows the site theme (window.__TROPHY.applyTheme).
   ========================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("trophy-canvas");
const wrap = canvas && canvas.parentElement;
const SITE = window.SITE_CONFIG || {};
const CFG = (SITE.specs || {}).trophy || {};
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stillMode = /[?&]still/.test(location.search);
const isMobile = window.innerWidth < 760;
const isWebKit = document.documentElement.classList.contains("is-webkit");

/* ---------- proportions (world units) ---------- */
const TIERS = [[1.6, 0.35], [1.36, 0.3], [1.12, 0.45]];     // octagonal plinth: radius, height
const PLINTH_H = TIERS.reduce((s, t) => s + t[1], 0);         // 1.1
const KNOT_H = 0.2, STAGES = 4;
const STEM_TOP = PLINTH_H + 0.02 + STAGES * KNOT_H;
const CUP_H = 1.66, RIM_Y = STEM_TOP + 1.6;
const STAR_Y = RIM_Y + 0.62;
const TOP = STAR_Y + 0.4;

/* ---------- timeline (s) ---------- */
const PLINTH_AT = 0.1, PLINTH_DUR = 0.9;
const RINGS_AT = 0.6;
const LOCK_AT = [1.7, 2.4, 3.1, 3.8], LOCK_DUR = 0.6;
const CUP_AT = 4.4, CUP_DUR = 1.1;
const STAR_AT = 5.2, STAR_DUR = 0.8;
const FLASH_AT = 5.6, CELEBRATE_EVERY = 14;

/* glow on a transparent canvas: add the colour and an alpha equal to its
   strength, so it reads on light pages too (plain additive blending wrote
   alpha = 1 and showed black where the glow was faint) */
const GLOW = { transparent: true, depthWrite: false, blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor };
const GLOW_OUT = "gl_FragColor = vec4(min(glow, vec3(1.0)), clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0));";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const prog = (t, at, dur) => clamp01((t - at) / dur);
const lerp = (a, b, k) => a + (b - a) * k;

function boot() {
  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const dpr = window.devicePixelRatio || 1;
  let pixelRatio = Math.min(dpr, isWebKit ? (isMobile ? 1.25 : 1.35) : (isMobile ? 1.5 : 1.75));
  const minRatio = Math.min(dpr, 1);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const world = new THREE.Group();
  scene.add(world);

  const hemi = new THREE.HemisphereLight(0xfff3e0, 0x16120c, 0.5);
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-4, 7, 6);
  const rim = new THREE.DirectionalLight(0xffcf8a, 1.4); rim.position.set(5, 4, -6);
  const glint = new THREE.PointLight(0xfff0d0, 0, 0, 2);      // sweeps the facets
  scene.add(hemi, key, rim, glint);

  /* ---------- materials ---------- */
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b464, metalness: 1, roughness: 0.2, envMapIntensity: 1.25, flatShading: true });
  const goldSmooth = new THREE.MeshStandardMaterial({ color: 0xd9ad5f, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 });
  const marble = new THREE.MeshStandardMaterial({ color: 0x121110, metalness: 0.15, roughness: 0.32, envMapIntensity: 0.7 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xe6bd6e, metalness: 1, roughness: 0.25, envMapIntensity: 1.2,
    emissive: 0x6b4a18, emissiveIntensity: 0.6, transparent: true });

  /* ---------- plinth: three octagonal tiers with gold inlays + plaque ---------- */
  const plinth = new THREE.Group();
  world.add(plinth);
  let y = 0;
  TIERS.forEach(([r, h], i) => {
    const g = new THREE.CylinderGeometry(r, r * (i === 0 ? 1.04 : 1), h, 8, 1, false, Math.PI / 8);
    g.translate(0, y + h / 2, 0);
    plinth.add(new THREE.Mesh(g, marble));
    const inlay = new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.025, 8, 1, true, Math.PI / 8);
    inlay.translate(0, y + h - 0.03, 0);
    plinth.add(new THREE.Mesh(inlay, goldSmooth));
    y += h;
  });
  // engraved plaque on the front face of the top tier
  const plaqueTex = makePlaque(CFG.plaque || ["ПРОМТЕХНОЛОГИЯ", "ПОЛНЫЙ ЦИКЛ"]);
  const [rT, hT] = TIERS[2];
  const faceW = 2 * rT * Math.sin(Math.PI / 8);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(faceW * 0.86, hT * 0.62),
    new THREE.MeshStandardMaterial({ map: plaqueTex, transparent: true, metalness: 1, roughness: 0.3, envMapIntensity: 1.2, color: 0xe2b768 }));
  plaque.position.set(0, PLINTH_H - hT / 2 - 0.01, rT * Math.cos(Math.PI / 8) + 0.003);
  plinth.add(plaque);

  /* ---------- stem: core + four knots (one per stage) ---------- */
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, STAGES * KNOT_H + 0.04, 12).translate(0, (STAGES * KNOT_H + 0.04) / 2, 0), goldSmooth);
  stem.position.y = PLINTH_H;
  world.add(stem);
  const knotGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.07, 0), new THREE.Vector2(0.19, 0.03), new THREE.Vector2(0.26, 0.09),
    new THREE.Vector2(0.19, 0.16), new THREE.Vector2(0.07, KNOT_H - 0.005)
  ], 12);
  const knots = [];
  for (let i = 0; i < STAGES; i++) {
    const k = new THREE.Mesh(knotGeo, gold);
    k.position.y = PLINTH_H + 0.02 + i * KNOT_H;
    world.add(k); knots.push(k);
  }

  /* ---------- the four stage rings ---------- */
  const ringGeo = new THREE.TorusGeometry(1, 0.022, 8, 120);
  const rings = [];
  for (let i = 0; i < STAGES; i++) {
    const m = new THREE.Mesh(ringGeo, ringMat.clone());
    world.add(m);
    rings.push({ m, r: 1.3 + i * 0.16, tilt: [0.5, -0.35, 0.25, -0.6][i], spin: [0.9, -0.7, 0.55, -1.1][i], phase: i * 1.7 });
  }

  /* ---------- cup: cut-crystal gold lathe + handles ---------- */
  const cupProfile = [
    [0.1, 0], [0.16, 0.05], [0.34, 0.2], [0.6, 0.55], [0.8, 1.0], [0.9, 1.42], [0.93, 1.6], [0.9, CUP_H],
    [0.85, 1.6], [0.82, 1.4], [0.73, 1.0], [0.55, 0.62], [0.0, 0.45]
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const cupGroup = new THREE.Group();
  cupGroup.position.y = STEM_TOP;
  world.add(cupGroup);
  const cupMat = gold.clone(); cupMat.side = THREE.DoubleSide;
  cupGroup.add(new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 14), cupMat));
  // rim band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.915, 0.025, 6, 56), goldSmooth);
  band.rotation.x = Math.PI / 2; band.position.y = CUP_H - 0.02;
  cupGroup.add(band);
  const handles = new THREE.Group();
  // ear handles: an arc of 1.1π on the outer side, ends tucked into the wall
  const hGeo = new THREE.TorusGeometry(0.34, 0.05, 8, 28, Math.PI * 1.1);
  [-1, 1].forEach((side) => {
    const h = new THREE.Mesh(hGeo, gold);
    h.rotation.z = side > 0 ? -Math.PI * 0.55 : Math.PI * 0.45;
    h.position.set(side * 0.84, 1.08, 0);
    handles.add(h);
  });
  cupGroup.add(handles);

  /* ---------- star above the cup ---------- */
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({
    color: 0xf3cf86, metalness: 1, roughness: 0.12, envMapIntensity: 1.6, flatShading: true, emissive: 0x7a5418, emissiveIntensity: 0.5 }));
  star.scale.set(1, 1.5, 1);
  star.position.y = STAR_Y;
  world.add(star);

  /* ---------- light pouring out of the cup ---------- */
  const GOLD = new THREE.Color("#f0c070");
  const raysU = { uTime: { value: 0 }, uA: { value: 0 }, uGold: { value: GOLD } };
  const rays = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.84, 4.2, 64, 1, true).translate(0, 2.1, 0), new THREE.ShaderMaterial({
    uniforms: raysU, ...GLOW, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uA; uniform vec3 uGold; varying vec2 vUv;
      void main() {
        float a = vUv.x * 6.2831853;
        float s = pow(0.5 + 0.5 * sin(a * 13.0 + uTime * 0.5 + sin(a * 37.0 + uTime * 0.3) * 1.4), 5.0);
        float yy = vUv.y;                                   // 0 at the rim, 1 at the top
        float k = s * pow(1.0 - yy, 2.2) * smoothstep(0.0, 0.06, yy) * uA;
        vec3 glow = uGold * k * 0.55; ${GLOW_OUT}
      }`
  }));
  rays.position.y = RIM_Y;
  world.add(rays);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.84, 48).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: raysU, ...GLOW,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uA, uTime; uniform vec3 uGold; varying vec2 vP;
      void main() {
        float r = length(vP) / 0.84;
        float ripple = 0.85 + 0.15 * sin(r * 18.0 - uTime * 2.0);
        vec3 glow = uGold * max(1.0 - r * r, 0.0) * ripple * uA * 1.3; ${GLOW_OUT}
      }`
  }));
  pool.position.y = RIM_Y - 0.1;
  world.add(pool);

  /* ---------- ground: soft glow / contact shadow + reflection rings ---------- */
  const groundU = { uA: { value: 0 }, uGold: { value: GOLD }, uShadow: { value: new THREE.Color(0x000000) }, uShadowA: { value: 0.5 }, uLineA: { value: 0.45 } };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: groundU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uA, uShadowA, uLineA; uniform vec3 uGold, uShadow; varying vec2 vP;
      float line(float d, float w) { float fw = fwidth(d); return 1.0 - smoothstep(w, w + fw * 1.5, abs(d)); }
      void main() {
        float r = length(vP);
        float rings = (line(r - 2.05, 0.008) + line(r - 2.35, 0.004) * 0.6 + line(r - 3.1, 0.004) * 0.35) * uLineA;
        float glow = exp(-pow(r - 1.7, 2.0) * 2.5) * 0.18;
        float la = clamp((rings + glow) * uA, 0.0, 1.0);
        float sh = exp(-r * r * 0.5) * uShadowA * uA;
        float alpha = la + sh * (1.0 - la);
        vec3 col = alpha > 0.0 ? mix(uShadow, uGold, la / alpha) : uGold;
        gl_FragColor = vec4(col, alpha * (1.0 - smoothstep(3.2, 4.4, r)));
        #include <colorspace_fragment>
      }`
  }));
  ground.renderOrder = -1;
  world.add(ground);

  /* ---------- sparks: burst from the cup, then drifting gold dust ---------- */
  const SP = isMobile ? 110 : 220;
  const seeds = new Float32Array(SP * 3);
  for (let i = 0; i < SP * 3; i++) seeds[i] = Math.random();
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SP * 3), 3));
  sGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  const sparkU = { uTime: { value: 0 }, uBurst: { value: -1 }, uPixel: { value: pixelRatio }, uGold: { value: GOLD }, uA: { value: 1 }, uAmb: { value: 0 } };
  const sparks = new THREE.Points(sGeo, new THREE.ShaderMaterial({
    uniforms: sparkU, ...GLOW,
    vertexShader: /* glsl */`
      attribute vec3 aSeed; uniform float uTime, uBurst, uPixel, uAmb; varying float vA;
      void main() {
        float a = aSeed.x * 6.2831853;
        // ambient: slow rising dust around the trophy
        float r = 0.9 + aSeed.y * 2.4;
        vec3 amb = vec3(cos(a + uTime * 0.05) * r, mod(aSeed.z * ${TOP.toFixed(1)} + uTime * (0.08 + aSeed.y * 0.18), ${TOP.toFixed(1)}), sin(a + uTime * 0.05) * r);
        float ambA = smoothstep(0.0, 0.6, amb.y) * (1.0 - smoothstep(${(TOP - 1).toFixed(1)}, ${TOP.toFixed(1)}, amb.y)) * 0.55 * uAmb;
        // burst: a fountain out of the cup
        float tb = uBurst;
        float inB = step(0.0, tb) * step(tb, 3.6) * step(aSeed.z, 0.75);
        vec3 v = vec3(cos(a) * (0.5 + aSeed.y * 1.7), 2.4 + aSeed.z * 3.2, sin(a) * (0.5 + aSeed.y * 1.7));
        vec3 bp = vec3(cos(a) * 0.6, ${RIM_Y.toFixed(2)}, sin(a) * 0.6) + v * tb + vec3(0.0, -2.2 * tb * tb, 0.0);
        float bA = (1.0 - smoothstep(1.8, 3.6, tb)) * smoothstep(0.0, 0.05, tb);
        vec3 p = mix(amb, bp, inB);
        vA = mix(ambA * (1.0 - step(0.0, tb) * step(tb, 3.6) * step(aSeed.z, 0.75)), bA, inB);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.6 + aSeed.y * 2.6 + inB * 1.6) * uPixel * (22.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uGold; uniform float uA; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float k = smoothstep(0.5, 0.0, d);
        vec3 glow = uGold * k * vA * uA * 1.4; ${GLOW_OUT}
      }`
  }));
  sparks.frustumCulled = false;
  world.add(sparks);

  /* ---------- checklist sync (specs.js exposes window.__CHECKLIST) ---------- */
  const marked = [false, false, false, false];
  function mark(i) {
    if (marked[i]) return;
    marked[i] = true;
    if (window.__CHECKLIST && window.__CHECKLIST.mark) window.__CHECKLIST.mark(i);
  }

  /* ---------- theme ---------- */
  let light = false;
  function applyTheme() {
    light = document.documentElement.getAttribute("data-theme") === "light";
    marble.color.set(light ? "#ece8e1" : "#121110");
    marble.roughness = light ? 0.4 : 0.32;
    groundU.uShadow.value.set(light ? "#3b3326" : "#000000");
    groundU.uShadowA.value = light ? 0.3 : 0.55;
    groundU.uLineA.value = light ? 0.8 : 0.45;
    sparkU.uA.value = light ? 0.55 : 1;                  // additive glow is faint on white
    hemi.intensity = light ? 0.9 : 0.5;
    if (!looping) render();
  }

  /* ---------- drag to rotate ---------- */
  let yaw = 0.35, yawVel = 0, drag = null, tiltT = 0, tilt = 0;
  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, id: e.pointerId }; yawVel = 0; });
  window.addEventListener("pointermove", (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      yawVel = dx * 0.007; yaw += yawVel;
      if (!looping) { world.rotation.y = yaw; render(); }
    } else if (e.pointerType === "mouse") {
      tiltT = (e.clientY / window.innerHeight - 0.5) * 0.08;
    }
  }, { passive: true });
  const endDrag = () => { drag = null; };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  /* ---------- framing ---------- */
  let W = 1, H = 1, sizedW = 0, sizedH = 0, sizedR = 0, fitDist = 14;
  const camTarget = new THREE.Vector3();
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    if (W === sizedW && H === sizedH && pixelRatio === sizedR) return;   // iOS toolbar resizes
    sizedW = W; sizedH = H; sizedR = pixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // the checklist card sits bottom-left on wide layouts: nudge the trophy right
    if (wrap && getComputedStyle(wrap.querySelector(".checklist") || wrap).position === "absolute") camera.setViewOffset(W, H, -W * 0.12, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    fitDist = Math.max((TOP * 0.6) / tanV, 2.9 / (tanV * camera.aspect));
    if (!looping) render();
  }
  function render() { renderer.render(scene, camera); }

  /* ---------- timeline ---------- */
  let t = 0, last = 0, looping = false, nextCelebrate = FLASH_AT, burstStart = -99;
  const finished = reduce || stillMode;
  function place(dt) {
    const T = finished ? 60 : t;

    // plinth rises, ground lights up
    const pe = easeOut(prog(T, PLINTH_AT, PLINTH_DUR));
    plinth.position.y = (1 - pe) * -1.2;
    plinth.scale.setScalar(0.92 + 0.08 * pe);
    groundU.uA.value = pe;

    // rings: orbit, then lock into the stem one by one
    let locked = 0;
    for (let i = 0; i < STAGES; i++) {
      const R = rings[i], m = R.m;
      const appear = easeOut(prog(T, RINGS_AT + i * 0.15, 0.6));
      const lk = easeInOut(prog(T, LOCK_AT[i], LOCK_DUR));
      const knotY = PLINTH_H + 0.02 + i * KNOT_H + 0.09;
      const orbitY = PLINTH_H + 0.6 + i * 0.55;
      m.position.y = lerp(orbitY + Math.sin(T * 0.9 + R.phase) * 0.12, knotY, lk);
      const sc = lerp(R.r, 0.26, lk) * (0.6 + 0.4 * appear);
      m.scale.set(sc, sc, sc * (1 + lk * 3));
      m.rotation.set(Math.PI / 2 + R.tilt * (1 - lk) * Math.cos(T * 0.6 + R.phase), T * R.spin * (1 - lk), R.tilt * (1 - lk) * Math.sin(T * 0.5 + R.phase));
      m.material.opacity = appear * (1 - smoothFade(lk));
      m.visible = m.material.opacity > 0.01;
      // the knot pops in as the ring closes on it
      const kp = prog(T, LOCK_AT[i] + LOCK_DUR * 0.6, 0.35);
      const ks = kp > 0 ? easeBack(kp) : 0;
      knots[i].scale.set(ks, ks > 0 ? 1 : 0, ks);
      knots[i].visible = ks > 0;
      if (kp > 0) { locked = i + 1; mark(i); }
    }
    stem.scale.y = Math.max(0.001, locked / STAGES);
    stem.visible = locked > 0;

    // cup grows out of the stem
    const ce = prog(T, CUP_AT, CUP_DUR);
    cupGroup.visible = ce > 0;
    const cb = ce > 0 ? easeBack(ce) : 0;
    cupGroup.scale.set(0.55 + 0.45 * cb, Math.max(0.001, cb), 0.55 + 0.45 * cb);
    cupGroup.rotation.y = (1 - easeOut(ce)) * -2.4;
    handles.scale.setScalar(easeBack(prog(T, CUP_AT + CUP_DUR * 0.6, 0.5)) || 0.001);

    // star drops in and keeps turning
    const se = prog(T, STAR_AT, STAR_DUR);
    star.visible = se > 0;
    star.position.y = STAR_Y + (1 - easeOut(se)) * 1.6 + Math.sin(T * 1.2) * 0.05;
    star.rotation.y = T * 0.9;
    star.scale.set(easeBack(se) || 0.001, (easeBack(se) || 0.001) * 1.5, easeBack(se) || 0.001);

    // celebration: light pours out, sparks fountain, glint sweeps
    if (!finished && T >= nextCelebrate) { burstStart = T; nextCelebrate = T + CELEBRATE_EVERY; }
    const tb = T - burstStart;
    sparkU.uBurst.value = finished ? -1 : tb;
    sparkU.uAmb.value = smoothFade(prog(T, FLASH_AT, 1.5));
    const flash = tb >= 0 && tb < 4 ? Math.exp(-tb * 1.4) : 0;
    const idleRays = finished ? 0.55 : smoothFade(prog(T, FLASH_AT, 1)) * 0.45;
    raysU.uA.value = (idleRays + flash * 1.4) * (light ? 0.6 : 1);
    raysU.uTime.value = T;
    // the glint light circles the cup; brighter during a celebration
    const ga = T * 0.7;
    glint.position.set(Math.cos(ga) * 3, RIM_Y + 0.4, Math.sin(ga) * 3);
    glint.intensity = (finished ? 8 : smoothFade(prog(T, CUP_AT, 1.5)) * 8) + flash * 30;

    // turn: auto + drag inertia
    if (!drag) { yaw += yawVel; yawVel *= Math.pow(0.04, dt); yaw += dt * 0.16 * (1 - Math.min(1, Math.abs(yawVel) * 40)); }
    world.rotation.y = yaw;

    // camera: close and low at the plinth, pulls back as the trophy grows
    const settle = finished ? 1 : easeInOut(prog(T, 0.4, STAR_AT + 0.6));
    const ty = lerp(PLINTH_H + 0.4, TOP * 0.5, settle);
    const dist = fitDist * lerp(0.7, 1, settle);
    tilt += (tiltT - tilt) * Math.min(1, dt * 3);
    camTarget.set(0, ty, 0);
    camera.position.set(0, ty + 0.9 + tilt * dist, dist);
    camera.lookAt(camTarget);
  }
  function smoothFade(k) { return k * k * (3 - 2 * k); }

  // adaptive resolution (same rule as the home scene)
  let perfSum = 0, perfN = 0;
  function adapt(raw) {
    if (raw <= 0 || raw > 0.25 || t < 3) return;
    perfSum += raw; perfN++;
    if (perfN < 90) return;
    const avg = perfSum / perfN; perfSum = 0; perfN = 0;
    if (avg > 1 / 40 && pixelRatio > minRatio) {
      pixelRatio = Math.max(minRatio, Math.round((pixelRatio - 0.25) * 100) / 100);
      sparkU.uPixel.value = pixelRatio;
      resize();
    }
  }

  function frame(now) {
    const raw = last ? (now - last) / 1000 : 0.016;
    const dt = Math.min(raw, 0.05);
    last = now; t += dt;
    adapt(raw);
    sparkU.uTime.value = t;
    place(dt);
    render();
  }

  window.addEventListener("resize", resize, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();
  applyTheme();

  if (finished) {
    sparkU.uTime.value = 4; sparkU.uAmb.value = 1; place(0.016); render();
  } else {
    let visible = false;
    const sync = () => {
      const on = visible && !document.hidden;
      if (on === looping) return;
      looping = on; last = 0;
      renderer.setAnimationLoop(on ? frame : null);
    };
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; sync(); }, { rootMargin: "60px 0px" }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
    place(0); render();
  }

  // re-draw the plaque once Manrope is in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    drawPlaque(plaqueTex.image, CFG.plaque || ["ПРОМТЕХНОЛОГИЯ", "ПОЛНЫЙ ЦИКЛ"]); plaqueTex.needsUpdate = true;
    if (!looping) render();
  });

  window.__TROPHY = {
    applyTheme, scene, renderer,
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, ratio: pixelRatio, t: t.toFixed(2) })
  };
}

/* engraved plaque: gold lettering on a transparent canvas */
function makePlaque(lines) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  drawPlaque(c, lines);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function drawPlaque(c, lines) {
  const x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = "#ffffff"; x.lineWidth = 4;
  x.strokeRect(10, 10, c.width - 20, c.height - 20);
  x.lineWidth = 1.5; x.strokeRect(22, 22, c.width - 44, c.height - 44);
  x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "700 46px Manrope, system-ui, sans-serif";
  x.fillText(lines[0] || "", c.width / 2, c.height * 0.42, c.width - 70);
  x.font = "600 26px Manrope, system-ui, sans-serif";
  if (x.letterSpacing !== undefined) x.letterSpacing = "6px";
  x.fillText(lines[1] || "", c.width / 2, c.height * 0.68, c.width - 70);
  if (x.letterSpacing !== undefined) x.letterSpacing = "0px";
}

// boot last: every module-level const above is initialised by now
if (canvas) {
  try { boot(); }
  catch (e) { console.warn("[trophy] disabled:", e); canvas.style.display = "none"; if (window.__CHECKLIST) window.__CHECKLIST.all(); }
}
