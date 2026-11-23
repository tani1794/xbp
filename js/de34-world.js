/* ==========================================================================
   de34-world.js — the white open world (Three.js r160)

   Reference motion (pin "Wireless Charger Landing Page"): rounded pebble /
   disc objects in graphite, slate, leather and ceramic float in white space,
   turn slowly and drift diagonally in sync with scroll; one object opens
   into an exploded view; the story ends with a line drawing of the object.

   This file recreates that motion as a walkable 3D world:
   - scroll = the camera travels along a path through 5 "stations"
     (one per page section) — like moving through an open world
   - the cursor turns your head a little (look-around)
   - glossy clear-coat materials + studio environment reflections
   - a tesseract (4D hypercube) rotating through the 4th dimension marks the
     archive stations; the HUD shows x / y / z / t
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.innerWidth < 720;
const host = document.getElementById('world');

function main() {
  /* ------------------------------------------------------------------
     Renderer / scene
     ------------------------------------------------------------------ */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      preserveDrawingBuffer: true, // the glass prism layer samples this canvas
      powerPreference: 'high-performance'
    });
  } catch (e) {
    return; // no WebGL: the CSS white studio background remains
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const WHITE = 0xf7f7f5;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(WHITE);
  scene.fog = new THREE.Fog(WHITE, 16, 70);

  // studio reflections → gloss on every surface
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(mobile ? 52 : 40, window.innerWidth / window.innerHeight, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e7ec, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.castShadow = !mobile;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -16; key.shadow.camera.right = 16;
  key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
  key.shadow.camera.near = 1; key.shadow.camera.far = 70;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key, key.target);

  // glossy white floor + perspective grid fading into the fog
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.22 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(800, 400, 0xcfd0d5, 0xe0e1e5);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  grid.position.y = 0.003;
  scene.add(grid);

  /* ------------------------------------------------------------------
     Materials (graphite / slate / leather / ceramic / metals)
     ------------------------------------------------------------------ */
  const M = {
    graphite: new THREE.MeshPhysicalMaterial({ color: 0x353f3b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    slate: new THREE.MeshPhysicalMaterial({ color: 0x6d7d8c, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }),
    leather: new THREE.MeshPhysicalMaterial({
      color: 0x9a3f17, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xe08a5c), clearcoat: 0.4, clearcoatRoughness: 0.35
    }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf6f6f4, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xd49a6c, metalness: 1, roughness: 0.18 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05 }),
    ink: new THREE.LineBasicMaterial({ color: 0x111113, transparent: true, opacity: 0.75 })
  };
  const SKINS = ['graphite', 'slate', 'leather', 'ceramic'];

  /* ------------------------------------------------------------------
     Pebble geometry: a lathe of a squircle profile (domed top, flatter base)
     ------------------------------------------------------------------ */
  function profile(from, to, steps) {
    const pts = [];
    const n = 4.2; // squircle exponent: rounder edge, flat faces
    for (let i = 0; i <= steps; i++) {
      const a = from + (to - from) * (i / steps);
      const c = Math.cos(a), s = Math.sin(a);
      const x = Math.pow(Math.abs(c), 2 / n);
      const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * (s > 0 ? 0.27 : 0.17);
      pts.push(new THREE.Vector2(Math.max(x, 0.0001), y));
    }
    return pts;
  }
  const G = {
    pebble: new THREE.LatheGeometry(profile(-Math.PI / 2, Math.PI / 2, 48), 72),
    top: new THREE.LatheGeometry(profile(0.02, Math.PI / 2, 28), 72),
    base: new THREE.LatheGeometry(profile(-Math.PI / 2, -0.02, 28), 72),
    coil: [0.32, 0.47, 0.62].map(r => new THREE.TorusGeometry(r, 0.035, 14, 72)),
    node: new THREE.SphereGeometry(1, 24, 16)
  };

  function pebble(skin, size, squash) {
    const m = new THREE.Mesh(G.pebble, M[skin]);
    m.scale.set(size * (squash || 1), size, size);
    m.castShadow = true;
    return m;
  }

  const animated = []; // {obj, base:Vector3, rot:Vector3, bob, ph, drift, spin}

  function addFloater(obj, opts) {
    const o = Object.assign({
      base: obj.position.clone(),
      rot: new THREE.Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z),
      bob: 0.25, ph: Math.random() * Math.PI * 2,
      drift: new THREE.Vector3(0.5, -0.3, 0),       // diagonal drift, like the reference
      spin: new THREE.Vector3(0.05, 0.12, 0.03),
      scrollSpin: 0                                  // rotation synced to scroll
    }, opts || {});
    o.obj = obj;
    animated.push(o);
    scene.add(obj);
    return o;
  }

  /* ------------------------------------------------------------------
     Stations (one per section). Objects sit right of the camera, the
     page copy sits left.
     ------------------------------------------------------------------ */
  const F = [
    new THREE.Vector3(3.4, 2.4, 0),
    new THREE.Vector3(-3.2, 2.7, -30),
    new THREE.Vector3(3.8, 3.1, -60),
    new THREE.Vector3(-3.0, 2.6, -90),
    new THREE.Vector3(3.2, 2.9, -120)
  ];
  const side = mobile ? new THREE.Vector3(-1.2, 1.4, 12.5) : new THREE.Vector3(-3.6, 0.3, 10);
  const camPts = F.map(f => f.clone().add(side));
  const lookPts = camPts.map(c => c.clone().add(new THREE.Vector3(mobile ? 0.6 : 1.0, -0.35, -10)));
  const camCurve = new THREE.CatmullRomCurve3(camPts, false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(lookPts, false, 'centripetal');

  // Station 0 · hero — four pebbles floating like the reference landing
  [
    ['graphite', [1.6, 1.5, -1.2], 1.7, 1.12, [0.55, 0.2, -0.25]],
    ['slate', [3.0, -0.6, 0.8], 1.25, 1.18, [0.62, -0.4, 0.2]],
    ['leather', [0.0, -1.2, 2.0], 1.0, 1.1, [0.5, 0.6, 0.15]],
    ['ceramic', [-0.2, 2.9, -3.4], 1.15, 1.2, [0.7, 0.1, -0.3]]
  ].forEach(([skin, p, s, sq, r], i) => {
    const m = pebble(skin, s, sq);
    m.position.copy(F[0]).add(new THREE.Vector3(...p));
    m.rotation.set(...r);
    addFloater(m, { bob: 0.3, drift: new THREE.Vector3(0.45, -0.28, 0.1), scrollSpin: i % 2 ? -1 : 1 });
  });

  // Station 1 · works 01 — exploded view (top shell / coil / base)
  const exploded = new THREE.Group();
  exploded.position.copy(F[1]).add(new THREE.Vector3(0.6, 0, -0.5));
  const xTop = new THREE.Mesh(G.top, M.leather);
  const xBase = new THREE.Mesh(G.base, M.ceramic);
  const xCoil = new THREE.Group();
  G.coil.forEach(g => { const t = new THREE.Mesh(g, M.copper); t.rotation.x = Math.PI / 2; t.castShadow = true; xCoil.add(t); });
  [xTop, xBase].forEach(m => { m.castShadow = true; });
  exploded.add(xTop, xCoil, xBase);
  exploded.scale.setScalar(2.1);
  exploded.rotation.set(0.42, 0, -0.12);
  scene.add(exploded);
  [['graphite', [2.8, 1.6, -2.5], 0.7], ['slate', [-1.5, -1.8, 1.5], 0.55]].forEach(([skin, p, s]) => {
    const m = pebble(skin, s, 1.15);
    m.position.copy(F[1]).add(new THREE.Vector3(...p));
    m.rotation.set(0.6, 0, 0.3);
    addFloater(m, { bob: 0.35 });
  });

  // 4D: tesseract (projected hypercube) with chrome vertices
  function makeTesseract(size) {
    const verts = [];
    for (let i = 0; i < 16; i++) verts.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
    const edges = [];
    for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) {
      let d = 0; for (let k = 0; k < 4; k++) if (verts[i][k] !== verts[j][k]) d++;
      if (d === 1) edges.push([i, j]);
    }
    const pos = new Float32Array(edges.length * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, M.ink);
    const nodes = new THREE.InstancedMesh(G.node, M.chrome, 16);
    nodes.castShadow = true;
    const group = new THREE.Group();
    group.add(lines, nodes);
    const p3 = verts.map(() => new THREE.Vector3());
    const mtx = new THREE.Matrix4();
    function update(a, b, c) {
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
      for (let i = 0; i < 16; i++) {
        let [x, y, z, w] = verts[i];
        // rotations through the 4th dimension: XW, YW, ZW planes
        let t = x * ca - w * sa; w = x * sa + w * ca; x = t;
        t = y * cb - w * sb; w = y * sb + w * cb; y = t;
        t = z * cc - w * sc; w = z * sc + w * cc; z = t;
        const k = 1 / (2.6 - w); // 4D → 3D perspective
        p3[i].set(x * k * size, y * k * size, z * k * size);
        const r = 0.05 * size * k * 1.6;
        mtx.makeScale(r, r, r).setPosition(p3[i]);
        nodes.setMatrixAt(i, mtx);
      }
      nodes.instanceMatrix.needsUpdate = true;
      let o = 0;
      for (const [i, j] of edges) {
        pos[o++] = p3[i].x; pos[o++] = p3[i].y; pos[o++] = p3[i].z;
        pos[o++] = p3[j].x; pos[o++] = p3[j].y; pos[o++] = p3[j].z;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere();
    }
    return { group, update };
  }

  // Station 2 · archive 01 — tesseract with 9 small pebbles in orbit (notes 01–09)
  const tess1 = makeTesseract(3.2);
  tess1.group.position.copy(F[2]).add(new THREE.Vector3(0.8, 0.6, -1.5));
  scene.add(tess1.group);
  const orbit1 = [];
  for (let i = 0; i < 9; i++) {
    const m = pebble(SKINS[i % 4], 0.32, 1.15);
    m.rotation.set(0.5, i, 0.2);
    scene.add(m);
    orbit1.push(m);
  }

  // Station 3 · works 02 — a balanced stack (growth)
  const stack = new THREE.Group();
  stack.position.copy(F[3]).add(new THREE.Vector3(0.8, -1.4, -0.8));
  [['slate', 1.5, 0], ['graphite', 1.15, 0.62], ['leather', 0.85, 1.12], ['ceramic', 0.55, 1.5]].forEach(([skin, s, y], i) => {
    const m = pebble(skin, s, 1.08);
    m.position.y = y * 1.1;
    m.rotation.set(0.05 * (i % 2 ? 1 : -1), i * 0.7, 0.04 * (i % 2 ? -1 : 1));
    stack.add(m);
  });
  stack.scale.setScalar(1.35);
  scene.add(stack);

  // Station 4 · archive 02 — the line drawing of the object (reference ending)
  const sketch = new THREE.Group();
  const prof = profile(-Math.PI / 2, Math.PI / 2, 12);
  prof.forEach(p => {
    const ring = [];
    for (let k = 0; k <= 72; k++) {
      const a = k / 72 * Math.PI * 2;
      ring.push(new THREE.Vector3(Math.cos(a) * p.x, p.y, Math.sin(a) * p.x));
    }
    sketch.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), M.ink));
  });
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const mer = profile(-Math.PI / 2, Math.PI / 2, 24).map(p => new THREE.Vector3(Math.cos(a) * p.x, p.y, Math.sin(a) * p.x));
    sketch.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mer), M.ink));
  }
  sketch.position.copy(F[4]).add(new THREE.Vector3(0.9, 0.2, -1));
  sketch.scale.set(2.6, 2.6, 2.6);
  sketch.rotation.set(0.45, 0, -0.15);
  scene.add(sketch);
  const orbit2 = [];
  for (let i = 0; i < 7; i++) {
    const m = pebble(SKINS[(i + 2) % 4], 0.3, 1.15);
    scene.add(m);
    orbit2.push(m);
  }
  const tess2 = makeTesseract(6);
  tess2.group.position.set(14, 9, -150);
  scene.add(tess2.group);

  // The open world: pebbles scattered across the whole landscape
  const pathX = z => {
    // camera x at a given z (approximate, for keeping the path clear)
    const t = THREE.MathUtils.clamp((camPts[0].z - z) / (camPts[0].z - camPts[4].z), 0, 1);
    return camCurve.getPoint(t).x;
  };
  const SCATTER = mobile ? 20 : 46;
  for (let i = 0, tries = 0; i < SCATTER && tries < 600; tries++) {
    const z = THREE.MathUtils.randFloat(-150, 22);
    const x = THREE.MathUtils.randFloat(-34, 34);
    if (Math.abs(x - pathX(z)) < 7) continue;
    const s = THREE.MathUtils.randFloat(0.45, 1.6);
    const m = pebble(SKINS[i % 4], s, THREE.MathUtils.randFloat(1, 1.3));
    m.position.set(x, THREE.MathUtils.randFloat(0.6 + s * 0.3, 10), z);
    m.rotation.set(THREE.MathUtils.randFloat(-0.8, 0.8), Math.random() * 6, THREE.MathUtils.randFloat(-0.5, 0.5));
    addFloater(m, {
      bob: THREE.MathUtils.randFloat(0.15, 0.6),
      drift: new THREE.Vector3(THREE.MathUtils.randFloat(0.2, 0.9), -THREE.MathUtils.randFloat(0.1, 0.5), 0),
      spin: new THREE.Vector3(Math.random() * 0.08, Math.random() * 0.2, Math.random() * 0.05),
      scrollSpin: (Math.random() - 0.5) * 0.6
    });
    i++;
  }

  /* ------------------------------------------------------------------
     Scroll → position on the path
     ------------------------------------------------------------------ */
  const stations = Array.prototype.slice.call(document.querySelectorAll('.station'));
  function scrollProgress() {
    const y = window.scrollY;
    const tops = stations.map(s => s.offsetTop);
    const n = tops.length;
    if (y <= tops[0]) return 0;
    for (let i = 0; i < n - 1; i++) {
      if (y < tops[i + 1]) return (i + (y - tops[i]) / (tops[i + 1] - tops[i])) / (n - 1);
    }
    return 1;
  }

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', e => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (reduce) render(0);
  });

  // glass tabs refract this canvas (overlay mode: drawn only while hovered)
  let prism = window.__de34Prism;
  if (!prism && window.GlassPrism) prism = window.__de34Prism = GlassPrism.init({ source: renderer.domElement, stage: host, overlay: true });
  if (prism) {
    prism.source = renderer.domElement;
    if (prism.canvas) host.appendChild(prism.canvas); // keep the prism layer on top
  }
  window.__de34World = true;

  const hud = ['cx', 'cy', 'cz', 'ct'].map(id => document.getElementById(id));
  const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3(), up = new THREE.Vector3();
  let p = scrollProgress(), lastScrollY = window.scrollY, scrollSpinAcc = 0;
  let intro = reduce ? 1 : 0;

  /* ------------------------------------------------------------------
     Frame
     ------------------------------------------------------------------ */
  function render(t, dt, rawDt) {
    dt = dt || 0;
    const camDt = Math.min(rawDt || dt, 0.5); // slow devices still reach the station
    const target = scrollProgress();
    p += (target - p) * (reduce ? 1 : 1 - Math.exp(-camDt * 4.2)); // inertial camera (frame-rate independent)
    const sy = window.scrollY;
    scrollSpinAcc += (sy - lastScrollY) * 0.0016;           // rotation synced to scroll
    lastScrollY = sy;
    const mk = 1 - Math.exp(-dt * 3);
    mouse.sx += (mouse.x - mouse.sx) * mk;
    mouse.sy += (mouse.y - mouse.sy) * mk;

    // camera on the path (+ an entrance fly-in on load)
    camCurve.getPoint(p, tmpPos);
    lookCurve.getPoint(p, tmpLook);
    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      tmpPos.add(up.set(0, 5 * (1 - e), 16 * (1 - e)));
    }
    camera.position.copy(tmpPos);
    camera.position.x += mouse.sx * 0.6;
    camera.position.y += -mouse.sy * 0.3;
    camera.lookAt(tmpLook);
    camera.rotateY(-mouse.sx * 0.16);                       // look around
    camera.rotateX(-mouse.sy * 0.07);

    // key light follows the traveller so nearby shadows stay crisp
    key.position.copy(tmpPos).add(up.set(8, 16, 6));
    key.target.position.copy(tmpLook);

    // floaters: bob, diagonal drift, slow spin, scroll-synced turn
    for (const o of animated) {
      const m = o.obj;
      const s = Math.sin(t * 0.32 + o.ph);
      m.position.set(
        o.base.x + o.drift.x * s,
        o.base.y + o.drift.y * s + Math.sin(t * 0.7 + o.ph) * o.bob,
        o.base.z + o.drift.z * s
      );
      m.rotation.set(
        o.rot.x + Math.sin(t * 0.4 + o.ph) * 0.12 + t * o.spin.x * 0.2,
        o.rot.y + t * o.spin.y + scrollSpinAcc * o.scrollSpin,
        o.rot.z + Math.cos(t * 0.35 + o.ph) * 0.08
      );
    }

    // exploded view opens as the camera arrives at station 1
    const near1 = 1 - Math.min(1, Math.abs(p * 4 - 1) * 1.6);
    const ex = THREE.MathUtils.smoothstep(near1, 0, 1);
    xTop.position.y = 0.06 + ex * 0.85;
    xCoil.position.y = 0.02 + ex * 0.38;
    xBase.position.y = -0.04 - ex * 0.2;
    xCoil.rotation.y = t * 0.6;
    exploded.rotation.y = t * 0.15 + scrollSpinAcc * 0.5;
    exploded.position.y = F[1].y + Math.sin(t * 0.6) * 0.2;

    // 4D rotation: time + scroll are the extra dimension
    const w = t * 0.35 + p * 6;
    tess1.update(w, w * 0.7, w * 0.45);
    tess1.group.rotation.y = t * 0.1;
    tess2.update(w * 0.6, w * 0.4, w * 0.9);
    orbit1.forEach((m, i) => {
      const a = t * 0.35 + i / 9 * Math.PI * 2;
      m.position.set(
        tess1.group.position.x + Math.cos(a) * 4.2,
        tess1.group.position.y + Math.sin(a * 2 + i) * 0.6,
        tess1.group.position.z + Math.sin(a) * 4.2
      );
      m.rotation.y = a * 2;
    });
    orbit2.forEach((m, i) => {
      const a = -t * 0.3 + i / 7 * Math.PI * 2;
      m.position.set(sketch.position.x + Math.cos(a) * 3.6, sketch.position.y + Math.sin(a * 3) * 0.4, sketch.position.z + Math.sin(a) * 3.6);
      m.rotation.set(0.5, a * 2, 0);
    });

    stack.rotation.y = Math.sin(t * 0.25) * 0.4 + scrollSpinAcc * 0.3;
    stack.children.forEach((m, i) => { m.rotation.y = i * 0.7 + Math.sin(t * 0.5 + i) * 0.25; });
    sketch.rotation.y = t * 0.2;

    renderer.render(scene, camera);
    if (prism) prism.render(t);

    if (hud[0]) {
      hud[0].textContent = camera.position.x.toFixed(2);
      hud[1].textContent = camera.position.y.toFixed(2);
      hud[2].textContent = camera.position.z.toFixed(2);
      hud[3].textContent = t.toFixed(2);
    }
  }

  if (reduce) {
    render(0);
    window.addEventListener('scroll', () => render(0), { passive: true });
    return;
  }

  let last = performance.now(), time = 0;
  function frame(now) {
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    time += dt;
    render(time, dt, raw);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
