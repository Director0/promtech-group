/* =============================================================================
   scene-building.js — ultra-minimalist "block of flats" (Three.js).
   A slim wireframe apartment tower with a window grid, a small setback crown,
   and a thin ground line. Slowly auto-rotates, tilts toward the mouse and floats.
   Framed inside #building-canvas. Mobile + reduced-motion aware.
   ========================================================================== */
import * as THREE from "three";

const canvas = document.getElementById("building-canvas");
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.innerWidth < 760;

if (canvas) {
  try { boot(); }
  catch (e) { console.warn("[building] disabled:", e); canvas.style.display = "none"; }
}

function col(css, name, fb) {
  const v = css.getPropertyValue(name).trim();
  try { return new THREE.Color(v || fb); } catch { return new THREE.Color(fb); }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function boot() {
  const css = getComputedStyle(document.documentElement);
  const gold = col(css, "--gold", "#D4A95C");
  const navyLight = col(css, "--navy-light", "#1B3F86");
  const line = navyLight.clone().lerp(gold, 0.25);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const camBase = new THREE.Vector3(6.2, 3.2, 12.5);
  const camTarget = new THREE.Vector3(0, 1.4, 0);
  camera.position.copy(camBase);
  camera.lookAt(camTarget);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(-5, 8, 6); scene.add(key);

  /* ---------- the building ---------- */
  const group = new THREE.Group();
  scene.add(group);

  // subtle solid volume so the wireframe reads as a real mass (very low opacity)
  const solidMat = new THREE.MeshStandardMaterial({
    color: navyLight, metalness: 0.2, roughness: 0.8,
    transparent: true, opacity: 0.14
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: line, transparent: true, opacity: 0.9 });
  const mullionMat = new THREE.LineBasicMaterial({ color: line, transparent: true, opacity: 0.4 });

  // main tower + a smaller setback crown, stacked
  const blocks = [
    { w: 3.0, h: 5.6, d: 2.2, y: 2.8, floors: 8, bays: 4 },
    { w: 2.0, h: 1.6, d: 1.5, y: 6.4, floors: 2, bays: 3 }
  ];

  blocks.forEach((b) => {
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh = new THREE.Mesh(geo, solidMat);
    mesh.position.y = b.y;
    group.add(mesh);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    edges.position.y = b.y;
    group.add(edges);

    // window grid (horizontal floor lines + vertical mullions) on front & back faces
    const mull = [];
    const x0 = -b.w / 2, x1 = b.w / 2, y0 = b.y - b.h / 2, y1 = b.y + b.h / 2;
    const zF = b.d / 2 + 0.001, zB = -b.d / 2 - 0.001;
    for (let f = 1; f < b.floors; f++) {
      const yy = y0 + (b.h * f) / b.floors;
      mull.push(x0, yy, zF, x1, yy, zF, x0, yy, zB, x1, yy, zB);
    }
    for (let c = 1; c < b.bays; c++) {
      const xx = x0 + (b.w * c) / b.bays;
      mull.push(xx, y0, zF, xx, y1, zF, xx, y0, zB, xx, y1, zB);
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.Float32BufferAttribute(mull, 3));
    group.add(new THREE.LineSegments(mg, mullionMat));
  });

  // thin ground line the tower sits on
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute("position", new THREE.Float32BufferAttribute([-3.2, 0, 1.6, 3.2, 0, 1.6, -3.2, 0, -1.6, 3.2, 0, -1.6, -2.4, 0, 0, 2.4, 0, 0], 3));
  scene.add(new THREE.LineSegments(gGeo, mullionMat));

  /* ---------- interaction: mouse parallax ---------- */
  let tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
  if (!prefersReduced) {
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = (e.clientY / window.innerHeight) * 2 - 1;
      tiltTX = -my * 0.12; tiltTY = mx * 0.35;
    }, { passive: true });
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w / h < 0.9;
    camBase.set(narrow ? 5.4 : 6.2, narrow ? 3.6 : 3.2, narrow ? 14 : 12.5);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const clock = new THREE.Clock();
  let elapsed = 0, rotY = 0.5;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    if (!prefersReduced) {
      rotY += 0.12 * dt;
      tiltX += (tiltTX - tiltX) * 0.05;
      tiltY += (tiltTY - tiltY) * 0.05;
      group.rotation.set(tiltX, rotY + tiltY, 0);
      group.position.y = Math.sin(elapsed * 0.7) * 0.12;
    } else {
      group.rotation.set(0, rotY, 0);
    }
    camera.position.copy(camBase);
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }

  if (prefersReduced) {
    [0, 200, 600].forEach((ms) => setTimeout(frame, ms));
  } else {
    renderer.setAnimationLoop(frame);
    document.addEventListener("visibilitychange", () => {
      renderer.setAnimationLoop(document.hidden ? null : frame);
    });
  }

  // keep line colors in sync when the theme flips
  window.__BUILDING = { applyTheme() {
    const c2 = getComputedStyle(document.documentElement);
    const g = col(c2, "--gold", "#D4A95C");
    const nl = col(c2, "--navy-light", "#1B3F86");
    const l = nl.clone().lerp(g, 0.25);
    edgeMat.color.copy(l); mullionMat.color.copy(l); solidMat.color.copy(nl);
  }};
}
