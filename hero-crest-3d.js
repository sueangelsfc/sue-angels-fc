// hero-crest-3d.js — "THE ECHO" hero. The crest, forged from light.
//
// Real extruded 3D geometry built from the traced crest vectors:
//   assets/badge/sue-angels-crest-silhouette.svg  -> navy metal shield
//   assets/badge/sue-angels-crest-marks.svg       -> emissive volt marks, floated in front
// plus a field of volt particles rising through the void (remembrance -> ascension).
//
// Behaviour:
//   intro    GSAP timeline: particles wake, shield rises + turns to face, marks
//            ignite, a key-light sweep glints across the bevel.
//   idle     gentle float + slow breathe, pointer-reactive tilt (lerped).
//   scroll   the crest recedes as Act 02 arrives (ScrollTrigger scrub).
//   fallback prefers-reduced-motion, no WebGL, or very low-end device ->
//            static full-colour crest (pixel-faithful PNG) with a volt glow.
//
// Perf: DPR capped, particle count tiered by device, RAF paused when the hero
// is offscreen or the tab is hidden. ES module, pinned three.js via importmap.

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const VOLT = 0xD6F23A;
const NAVY = 0x0B2836;

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
const lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
               (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

// Wait for the React-rendered mount node (#v-hero-3d), then init.
function whenMountReady(cb) {
  const t0 = performance.now();
  (function poll() {
    const el = document.getElementById('v-hero-3d');
    if (el) return cb(el);
    if (performance.now() - t0 > 6000) return; // homepage failed to mount; nothing to do
    requestAnimationFrame(poll);
  })();
}

// Static fallback: the full-colour crest, glowing softly. Brand-faithful, instant.
function mountFallback(host) {
  host.innerHTML =
    '<div class="v-hero__fallback" aria-hidden="true">' +
      '<div class="v-hero__fallback-stack">' +
        '<img src="assets/badge/sue-angels-badge-cutout.webp" alt="" ' +
             'style="filter:drop-shadow(0 0 34px rgba(255, 106, 42, .28)) drop-shadow(0 18px 44px rgba(0,0,0,.5))" />' +
      '</div>' +
    '</div>';
  document.documentElement.classList.add('no-motion-hero');
}

whenMountReady((host) => {
  if (reduceMotion || lowEnd || !webglOK()) { mountFallback(host); return; }
  init(host).catch((err) => {
    console.error('[hero3d] init failed, using static crest', err);
    mountFallback(host);
  });
});

async function init(host) {
  // ---- renderer / scene / camera -----------------------------------------
  const dprCap = isMobile ? 1.5 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: dpr < 2 });
  renderer.setPixelRatio(dpr);
  renderer.setSize(host.clientWidth, host.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, .1, 60);
  camera.position.set(0, 0, 6);

  // ---- lights: one cool key, one volt rim, a whisper of ambient -----------
  const ambient = new THREE.AmbientLight(0x8FB4C6, .38);
  const key = new THREE.DirectionalLight(0xEAF6FF, 2.4);
  key.position.set(-7, 3.4, 5);                       // starts left, sweeps right in the intro
  const rim = new THREE.PointLight(VOLT, 26, 16, 1.8); // volt uplight, the "candle"
  rim.position.set(-2.6, -2.2, 2.6);
  scene.add(ambient, key, rim);

  // ---- the crest -----------------------------------------------------------
  const loader = new SVGLoader();
  const [silhouette, marks] = await Promise.all([
    loader.loadAsync('assets/badge/sue-angels-crest-silhouette.svg'),
    loader.loadAsync('assets/badge/sue-angels-crest-marks.svg'),
  ]);

  const crest = new THREE.Group();
  const S = 2.35 / 512;                 // SVG space (512) -> ~2.35 world units tall

  const shieldMat = new THREE.MeshStandardMaterial({
    color: NAVY, metalness: .52, roughness: .34, side: THREE.DoubleSide,
  });
  const shieldSideMat = new THREE.MeshStandardMaterial({
    color: 0x061520, metalness: .6, roughness: .3, side: THREE.DoubleSide,
  });
  const marksMat = new THREE.MeshStandardMaterial({
    color: VOLT, emissive: VOLT, emissiveIntensity: .95,
    metalness: .1, roughness: .42, side: THREE.DoubleSide, transparent: true, opacity: 0,
  });

  function buildLayer(svgData, depth, faceMat, sideMat, z) {
    const group = new THREE.Group();
    for (const path of svgData.paths) {
      const shapes = SVGLoader.createShapes(path);
      for (const shape of shapes) {
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth, bevelEnabled: depth > 12, bevelThickness: 3.4, bevelSize: 2.6, bevelSegments: 3,
          curveSegments: 10,
        });
        group.add(new THREE.Mesh(geo, sideMat ? [faceMat, sideMat] : faceMat));
      }
    }
    // SVG y runs down; mirror vertically, scale to world, then centre.
    group.scale.set(S, -S, S);
    const box = new THREE.Box3().setFromObject(group);
    const c = box.getCenter(new THREE.Vector3());
    group.position.set(-c.x, -c.y, z);
    return group;
  }

  const shield = buildLayer(silhouette, 30, shieldMat, shieldSideMat, 0);
  const marksLayer = buildLayer(marks, 7, marksMat, null, 30 * S + .028);
  crest.add(shield, marksLayer);
  crest.position.y = isMobile ? .18 : .06;   // sit above the lower-third content
  scene.add(crest);

  // ---- the ascension field: volt particles rising --------------------------
  const N = isMobile ? 340 : 900;
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 11;
    pos[i * 3 + 1] = (Math.random() - .5) * 7;
    pos[i * 3 + 2] = -2.5 + Math.random() * 4.2;
    speed[i] = .0011 + Math.random() * .0032;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    color: VOLT, size: .021, sizeAttenuation: true,
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ---- intro (GSAP if present, else settle instantly) ----------------------
  let idle = false;
  const baseRotY = -.12, baseRotX = -.05;
  const g = window.gsap;
  if (g) {
    crest.position.y -= 1.5;
    crest.rotation.y = -1.15;
    crest.rotation.x = .22;
    crest.scale.setScalar(.8);
    const restY = isMobile ? .18 : .06;
    const tl = g.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(pMat, { opacity: .8, duration: 2.1, ease: 'power2.inOut' }, 0)
      .to(crest.position, { y: restY, duration: 1.9 }, .22)
      .to(crest.rotation, { y: baseRotY, x: baseRotX, duration: 1.9 }, .22)
      .to(crest.scale, { x: 1, y: 1, z: 1, duration: 1.9 }, .22)
      .to(marksMat, { opacity: 1, emissiveIntensity: 1.5, duration: 1.05, ease: 'power3.out' }, 1.0)
      .to(marksMat, { emissiveIntensity: .95, duration: .9, ease: 'power2.inOut' }, 2.05)
      .to(key.position, { x: 6.5, duration: 1.6, ease: 'power2.inOut' }, .95)
      .add(() => { idle = true; document.dispatchEvent(new Event('sa-hero-ready')); });
  } else {
    crest.rotation.set(baseRotX, baseRotY, 0);
    marksMat.opacity = 1; pMat.opacity = .8; key.position.x = 6.5;
    idle = true;
  }

  // ---- scroll handoff: the crest recedes into memory -----------------------
  if (g && g.ScrollTrigger) {
    g.to(crest.position, {
      y: '-=0.5', ease: 'none',
      scrollTrigger: { trigger: '.v-hero', start: 'top top', end: 'bottom top', scrub: .6 },
    });
    g.to(crest.scale, {
      x: .86, y: .86, z: .86, ease: 'none',
      scrollTrigger: { trigger: '.v-hero', start: 'top top', end: 'bottom top', scrub: .6 },
    });
    g.to(host, {
      opacity: .16, ease: 'none',
      scrollTrigger: { trigger: '.v-hero', start: '18% top', end: 'bottom top', scrub: .6 },
    });
  }

  // ---- idle: float, breathe, follow the pointer -----------------------------
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // pause when hidden/offscreen
  let visible = true, tabVisible = !document.hidden, rafId = 0;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && tabVisible && !rafId) rafId = requestAnimationFrame(tick);
  }, { threshold: .02 }).observe(host);
  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    if (visible && tabVisible && !rafId) rafId = requestAnimationFrame(tick);
  });

  const clock = new THREE.Clock();
  function tick() {
    rafId = 0;
    if (!visible || !tabVisible) return;
    const t = clock.getElapsedTime();

    // particles rise; wrap back under the fold
    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 1] += speed[i];
      if (arr[i * 3 + 1] > 3.6) arr[i * 3 + 1] = -3.6;
    }
    pGeo.attributes.position.needsUpdate = true;

    if (idle) {
      crest.position.y += Math.sin(t * .9) * .00042;                       // breath
      crest.rotation.y += ((baseRotY + pointer.x * .16) - crest.rotation.y) * .05;
      crest.rotation.x += ((baseRotX + pointer.y * .1) - crest.rotation.x) * .05;
      rim.intensity = 26 + Math.sin(t * 1.35) * 5;                          // candle flicker, subtle
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  // ---- resize ----------------------------------------------------------------
  let ro = new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });
  ro.observe(host);
}
