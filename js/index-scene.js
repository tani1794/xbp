/* ==========================================================================
   index-scene.js — XBP gateway (dark)

   1. Background: translucent blue/navy bubbles with glowing gold rims flow
      from deep in the screen toward the viewer (a depth tunnel). They breathe
      slowly and drift with the cursor. Scrolling pushes the camera forward.
      Drawn in code on a 2D canvas (no video).
   2. Scroll: the 4 archive cards arrive like faces of a rotating tetrahedron —
      from the side (rotateY), diagonally (rotateZ + Y), vertically (rotateX) —
      then land and float gently.
   3. Hero parallax, phrase rotation, dot navigation.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.GlassPrism ? GlassPrism.reduceMotion
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Background: bubble tunnel
     --------------------------------------------------------------------- */
  var cv = document.getElementById('bg-canvas');
  var cx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  var scrollVel = 0, lastScroll = window.scrollY, camBoost = 0;

  var Z_NEAR = 0.22, Z_FAR = 2.4, FOCAL = 0.62;
  var COUNT = window.innerWidth < 720 ? 11 : 17;
  var bubbles = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(b, far) {
    var ang = rand(0, Math.PI * 2);
    var rad = rand(0.18, 1.05);
    b.x = Math.cos(ang) * rad * 1.3;
    b.y = Math.sin(ang) * rad * 0.85;
    b.z = far ? rand(Z_FAR * 0.8, Z_FAR) : rand(Z_NEAR + 0.2, Z_FAR);
    b.r = rand(0.16, 0.42);
    b.phase = rand(0, Math.PI * 2);
    b.hue = rand(-1, 1);          // slight blue ↔ navy variation
    b.rimSide = rand(0, Math.PI * 2);
    return b;
  }
  for (var i = 0; i < COUNT; i++) bubbles.push(spawn({}, false));

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawBubble(b, t) {
    var S = Math.min(W, H) * 1.15;
    var k = FOCAL / b.z;
    var px = W / 2 + (b.x - mouse.sx * 0.18 * (1 / b.z)) * k * S * 0.62;
    var py = H / 2 + (b.y - mouse.sy * 0.12 * (1 / b.z)) * k * S * 0.62;
    var breathe = 1 + Math.sin(t * 0.55 + b.phase) * 0.045;
    var r = b.r * k * S * 0.5 * breathe;
    if (r < 2 || px + r < -50 || px - r > W + 50 || py + r < -50 || py - r > H + 50) return;

    // fade in from the far end, fade out as it passes the camera
    var a = Math.min(1, (Z_FAR - b.z) / 0.5) * Math.min(1, (b.z - Z_NEAR) / 0.35);
    // far bubbles are dimmer (aerial perspective)
    a *= 0.45 + 0.55 * Math.min(1, 1.1 / b.z);
    if (a <= 0.01) return;

    var blue = 0.5 + b.hue * 0.5; // 0 navy .. 1 brighter blue

    // body: clear centre, dense navy edge (like a lens / soap bubble)
    var g = cx.createRadialGradient(px - r * 0.18, py - r * 0.22, r * 0.05, px, py, r);
    g.addColorStop(0, 'rgba(150,180,255,' + (0.03 * a) + ')');
    g.addColorStop(0.62, 'rgba(' + (40 + 30 * blue | 0) + ',' + (60 + 40 * blue | 0) + ',' + (150 + 50 * blue | 0) + ',' + (0.12 * a) + ')');
    g.addColorStop(0.9, 'rgba(22,34,96,' + (0.42 * a) + ')');
    g.addColorStop(1, 'rgba(12,18,56,' + (0.62 * a) + ')');
    cx.beginPath();
    cx.arc(px, py, r, 0, Math.PI * 2);
    cx.fillStyle = g;
    cx.fill();

    // overlapping darker "shadow" lobe — the navy core seen in the reference
    var g2 = cx.createRadialGradient(px + r * 0.25, py + r * 0.3, 0, px + r * 0.25, py + r * 0.3, r * 0.75);
    g2.addColorStop(0, 'rgba(14,16,52,' + (0.28 * a) + ')');
    g2.addColorStop(1, 'rgba(14,16,52,0)');
    cx.fillStyle = g2;
    cx.fill();

    // gold / peach rim glow (strongest on one side, like back-lighting)
    cx.lineWidth = Math.max(1, r * 0.012);
    var rim = cx.createLinearGradient(
      px + Math.cos(b.rimSide) * r, py + Math.sin(b.rimSide) * r,
      px - Math.cos(b.rimSide) * r, py - Math.sin(b.rimSide) * r);
    rim.addColorStop(0, 'rgba(244,206,150,' + (0.95 * a) + ')');
    rim.addColorStop(0.5, 'rgba(232,196,143,' + (0.35 * a) + ')');
    rim.addColorStop(1, 'rgba(232,196,143,' + (0.12 * a) + ')');
    cx.strokeStyle = rim;
    cx.stroke();

    // soft halo outside the rim
    cx.beginPath();
    cx.arc(px, py, r + Math.max(2, r * 0.03), 0, Math.PI * 2);
    cx.lineWidth = Math.max(3, r * 0.06);
    cx.strokeStyle = 'rgba(232,184,130,' + (0.07 * a) + ')';
    cx.stroke();

    // small specular highlight
    cx.beginPath();
    cx.ellipse(px - r * 0.42, py - r * 0.5, r * 0.16, r * 0.06, -0.7, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(255,255,255,' + (0.07 * a) + ')';
    cx.fill();
  }

  function drawBackground(t, dt) {
    cx.fillStyle = '#0b0b0d';
    cx.fillRect(0, 0, W, H);

    // deep blue glow at the vanishing point
    var vg = cx.createRadialGradient(W * 0.62, H * 0.38, 0, W * 0.62, H * 0.38, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'rgba(40,62,140,0.20)');
    vg.addColorStop(0.5, 'rgba(20,28,70,0.08)');
    vg.addColorStop(1, 'rgba(11,11,13,0)');
    cx.fillStyle = vg;
    cx.fillRect(0, 0, W, H);

    // camera moves forward: base speed + scroll push
    var speed = 0.055 + camBoost;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      b.z -= speed * dt;
      b.x += Math.sin(t * 0.07 + b.phase) * 0.0006;
      if (b.z < Z_NEAR) spawn(b, true);
    }
    bubbles.sort(function (a, b) { return b.z - a.z; });
    for (var j = 0; j < bubbles.length; j++) drawBubble(bubbles[j], t);

    // vignette keeps text readable
    var vn = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
    vn.addColorStop(0, 'rgba(11,11,13,0)');
    vn.addColorStop(1, 'rgba(11,11,13,0.55)');
    cx.fillStyle = vn;
    cx.fillRect(0, 0, W, H);
  }

  resize();
  window.addEventListener('resize', resize);

  var prism = window.GlassPrism
    ? GlassPrism.init({ source: cv, stage: cv.parentNode })
    : { render: function () {} };

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX / W - 0.5;
    mouse.y = e.clientY / H - 0.5;
  }, { passive: true });

  /* ---------------------------------------------------------------------
     Scroll-driven 3D: tetrahedron card entry + hero parallax
     --------------------------------------------------------------------- */
  // Entry poses (degrees): side, diagonal, vertical, diagonal (reverse)
  var POSES = [
    { rx: 0, ry: -72, rz: 0 },
    { rx: 22, ry: 42, rz: 30 },
    { rx: 66, ry: 0, rz: 0 },
    { rx: -20, ry: -40, rz: -26 }
  ];
  var cards = Array.prototype.slice.call(document.querySelectorAll('.archive-card'));
  var scene = document.getElementById('tetra-scene');
  var heroPanel = document.querySelector('.hero-panel');
  var heroSide = document.querySelector('.hero-side');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }

  function updateScroll(t) {
    var vh = window.innerHeight;
    var sy = window.scrollY;

    // hero: the camera flies past the panel
    if (heroPanel) {
      var hp = clamp(sy / (vh * 0.9), 0, 1);
      heroPanel.style.transform =
        'perspective(1000px) translate3d(0,' + (hp * 60).toFixed(1) + 'px,' + (hp * 220).toFixed(1) + 'px) ' +
        'rotateX(calc(' + (hp * -6).toFixed(2) + 'deg + var(--tilt-x, 0deg))) rotateY(var(--tilt-y, 0deg))';
      heroPanel.style.opacity = Math.max(0, 1 - hp * 1.25).toFixed(3);
      heroSide.style.transform = 'translate3d(0,' + (sy * -0.18).toFixed(1) + 'px,0)';
    }

    // archive cards
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var top = c.parentNode.getBoundingClientRect().top + c.offsetTop;
      var p = clamp((vh * 1.02 - top) / (vh * 0.62), 0, 1);
      var e = easeOutCubic(p);
      var pose = POSES[+c.getAttribute('data-pose') || 0];
      var inv = 1 - e;
      // landed float: ±4° wobble (very gentle)
      var fl = e * e;
      var fx = Math.sin(t * 0.8 + i * 1.7) * 1.6 * fl;
      var fy = Math.cos(t * 0.6 + i * 1.3) * 1.4 * fl;
      c.style.setProperty('--rx', (pose.rx * inv + fx).toFixed(2) + 'deg');
      c.style.setProperty('--ry', (pose.ry * inv + fy).toFixed(2) + 'deg');
      c.style.setProperty('--rz', (pose.rz * inv).toFixed(2) + 'deg');
      c.style.setProperty('--tz', (-520 * inv).toFixed(1) + 'px');
      c.style.setProperty('--fy', (Math.sin(t * 0.9 + i) * 4 * fl).toFixed(2) + 'px');
      c.style.setProperty('--op', (0.12 + 0.88 * e).toFixed(3));
    }

    // look-around: perspective follows the cursor a little
    if (scene) {
      scene.style.perspectiveOrigin = (50 + mouse.sx * 18).toFixed(1) + '% ' + (40 + mouse.sy * 18).toFixed(1) + '%';
    }
  }

  function setFinalPoses() {
    cards.forEach(function (c) {
      ['--rx', '--ry', '--rz'].forEach(function (k) { c.style.setProperty(k, '0deg'); });
      c.style.setProperty('--tz', '0px');
      c.style.setProperty('--op', '1');
    });
  }

  /* ---------------------------------------------------------------------
     Main loop (paused automatically by the browser in background tabs)
     --------------------------------------------------------------------- */
  var last = performance.now();
  var t = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;

    var sy = window.scrollY;
    scrollVel = scrollVel * 0.85 + Math.abs(sy - lastScroll) * 0.15;
    lastScroll = sy;
    camBoost += (Math.min(scrollVel * 0.012, 0.6) - camBoost) * 0.08;

    drawBackground(t, dt);
    prism.render(t);
    updateScroll(t);

    requestAnimationFrame(frame);
  }

  if (reduce) {
    // one still frame, no motion
    drawBackground(0, 0);
    setFinalPoses();
    var redraw = function () { resize(); drawBackground(0, 0); };
    window.addEventListener('resize', redraw);
  } else {
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     Rotating phrases
     --------------------------------------------------------------------- */
  var phrases = document.querySelectorAll('.phrase');
  var idxEl = document.getElementById('phrase-index');
  var cur = 0;
  if (phrases.length && !reduce) {
    setInterval(function () {
      phrases[cur].classList.remove('is-active');
      cur = (cur + 1) % phrases.length;
      phrases[cur].classList.add('is-active');
      if (idxEl) idxEl.textContent = '0' + (cur + 1);
    }, 2800);
  }

  /* ---------------------------------------------------------------------
     Dot navigation + header links: highlight current section
     --------------------------------------------------------------------- */
  var links = document.querySelectorAll('.dot-nav a, .site-header .nav a');
  var sections = document.querySelectorAll('main section[id]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }
})();
