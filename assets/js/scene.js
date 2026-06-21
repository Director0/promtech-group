/* =============================================================================
   scene.js — hero 3D: a LIQUID-GLASS CUBE (Three.js).
   A refractive rounded glass cube with a glowing core inside. It floats idle,
   slowly auto-rotates, tilts toward the mouse, and can be grabbed and spun by
   dragging (with inertia on release). Framed on the RIGHT, kept 100% in view.
   Mobile + reduced-motion aware. No asset files needed.
   ========================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CFG = (window.SITE_CONFIG && window.SITE_CONFIG.scene) || {};
const THEME = (window.SITE_CONFIG && window.SITE_CONFIG.theme && window.SITE_CONFIG.theme.colors) || {};
const canvas = document.getElementById("scene-canvas");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.innerWidth < 760;

if (canvas && CFG.enabled !== false) {
  try { boot(); }
  catch (e) { console.warn("[scene] disabled:", e); canvas.style.display = "none"; }
}

function col(v, fb) { try { return new THREE.Color(v || fb); } catch { return new THREE.Color(fb); } }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function boot() {
  const navy = col(THEME.navy, "#0D2150");
  const navyLight = col(THEME.navyLight, "#1B3F86");
  const gold = col(THEME.gold, "#D4A95C");
  const goldSoft = col(THEME.goldSoft, "#F1D7A0");
  const bg = col(THEME.bg, "#04060C");
  const blue = navyLight.clone().lerp(new THREE.Color(0x8fd0ff), 0.6);
  const intensity = typeof CFG.intensity === "number" ? CFG.intensity : 1.0;

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  /* ---------- scene + camera ---------- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(bg, 0.012);

  // studio environment so the glass has something to reflect/refract
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const camTarget = new THREE.Vector3(3.4, 2.6, 0);
  const camBase = new THREE.Vector3(-2.4, 3.4, 13.6);
  camera.position.copy(camBase);
  camera.lookAt(camTarget);

  /* ---------- lighting ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.35 * intensity));
  const key = new THREE.DirectionalLight(0xffffff, 1.3 * intensity); key.position.set(-6, 7, 9); scene.add(key);
  const rim = new THREE.PointLight(gold, 7 * intensity, 24, 2); rim.position.set(7, 4, -4); scene.add(rim);
  const fill = new THREE.PointLight(navyLight, 5 * intensity, 24, 2); fill.position.set(-6, 2, 6); scene.add(fill);

  /* ---------- the liquid-glass cube ---------- */
  const baseY = 2.6;
  const cubeGroup = new THREE.Group();
  cubeGroup.position.set(5.0, baseY, 0);
  scene.add(cubeGroup);

  const SIZE = 4.0;
  // modern brushed-metal cube; tint shifts warm/cool with the mouse
  const coolMetal = navyLight.clone().lerp(new THREE.Color(0xcdd6e6), 0.7); // cool steel-blue
  const warmMetal = gold.clone().lerp(new THREE.Color(0xe9e2d2), 0.55);     // warm champagne steel
  const tintTmp = new THREE.Color();
  const metalMat = new THREE.MeshStandardMaterial({
    color: coolMetal.clone().lerp(warmMetal, 0.5),
    metalness: 1.0,
    roughness: 0.26,
    envMapIntensity: 1.35
  });
  const cube = new THREE.Mesh(new RoundedBoxGeometry(SIZE, SIZE, SIZE, 6, 0.35), metalMat);
  cubeGroup.add(cube);

  /* ---------- starfield (refraction backdrop) ---------- */
  const starN = isMobile ? 140 : 300;
  const sp = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 90;
    sp[i * 3 + 1] = Math.random() * 30 + 4;
    sp[i * 3 + 2] = (Math.random() - 0.5) * 60 - 18;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbcc8e6, size: 0.1, transparent: true, opacity: 0.65 }));
  scene.add(stars);

  /* ---------- interaction: drag to rotate + mouse parallax ---------- */
  let dragging = false, lastX = 0, lastY = 0;
  let rotX = -0.18, rotY = 0.55;   // accumulated base rotation
  let velX = 0, velY = 0;          // inertia after release
  let tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0; // mouse parallax
  let mx = 0, my = 0;              // normalized mouse (-1..1) for tint

  canvas.style.cursor = "grab";

  function onDown(e) {
    if (e.pointerType === "touch") return;       // let touch scroll the page
    dragging = true; lastX = e.clientX; lastY = e.clientY; velX = velY = 0;
    canvas.style.cursor = "grabbing";
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (e.pointerType !== "touch") {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      tiltTX = -my * 0.16;
      tiltTY = mx * 0.28;
    }
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    rotY += dx * 0.006; rotX += dy * 0.006;
    rotX = clamp(rotX, -0.95, 0.95);
    velY = dx * 0.006; velX = dy * 0.006;
    lastX = e.clientX; lastY = e.clientY;
  }
  function onUp() { dragging = false; canvas.style.cursor = "grab"; }

  if (!prefersReduced) {
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
  }

  /* ---------- resize (keep cube fully framed) ---------- */
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w / h < 0.85;
    camBase.set(narrow ? 0 : -2.4, narrow ? 3.0 : 3.4, narrow ? 18 : 13.6);
    camTarget.set(narrow ? 3.2 : 3.4, narrow ? 2.4 : 2.6, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  /* ---------- animation ---------- */
  const clock = new THREE.Clock();
  let elapsed = 0;
  const AUTO = (CFG.rotateSpeed || 0.10);

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (!prefersReduced) {
      if (!dragging) {
        rotY += AUTO * dt;          // gentle auto spin
        rotX += velX; rotY += velY; // inertia
        velX *= 0.92; velY *= 0.92;
        rotX = clamp(rotX, -0.95, 0.95);
      }
      tiltX += (tiltTX - tiltX) * 0.05;
      tiltY += (tiltTY - tiltY) * 0.05;
      cubeGroup.rotation.set(rotX + tiltX, rotY + tiltY, 0);
      cubeGroup.position.y = baseY + Math.sin(elapsed * 0.8) * 0.12; // idle float

      // metal picks up a warm/cool reflective tint from the mouse
      tintTmp.copy(coolMetal).lerp(warmMetal, mx * 0.5 + 0.5);
      metalMat.color.lerp(tintTmp, 0.07);
      metalMat.roughness = 0.20 + (my * 0.5 + 0.5) * 0.14;
      stars.rotation.y = elapsed * 0.004;
    } else {
      cubeGroup.rotation.set(rotX, rotY, 0);
    }

    camera.position.copy(camBase);
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }

  const stillMode = /[?&]still/.test(location.search);
  if (prefersReduced || stillMode) {
    [0, 300, 800].forEach(ms => setTimeout(frame, ms));
  } else {
    renderer.setAnimationLoop(frame);
    document.addEventListener("visibilitychange", () => {
      renderer.setAnimationLoop(document.hidden ? null : frame);
    });
  }

  document.documentElement.classList.add("scene-ready");

  // debug handle
  window.__SCENE = { scene, camera, cubeGroup, renderer, frame, camBase, camTarget };
  window.__sceneInfo = function () {
    const b = new THREE.Box3().setFromObject(cubeGroup);
    const r2 = (v) => [v.x, v.y, v.z].map(n => +n.toFixed(2));
    return { cube: { size: r2(b.getSize(new THREE.Vector3())), center: r2(b.getCenter(new THREE.Vector3())) }, camera: r2(camera.position) };
  };
}
