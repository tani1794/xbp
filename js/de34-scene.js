/* ==========================================================================
   de34-scene.js — Design III・IV portfolio (light cream gallery)

   1. Background (code, no video): based on the glass-UI reference motion —
      glowing cobalt orbs pulse while rings with an iridescent edge expand
      outward and fade like ripples (≈3.2 s cycle). Slow drift + scroll
      parallax.
   2. Reveal: sections rise out of depth; galleries tilt toward the cursor
      (±4°); cards float gently (CSS).
   3. Scroll progress bar, dot navigation.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.GlassPrism ? GlassPrism.reduceMotion
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cv = document.getElementById('bg-canvas');
  var cx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };

  // ring systems: fx = x as fraction of width, fy = y as fraction of height
  // (in a 2.4-screen tall loop), R = radius relative to min(W, H)
  var SYSTEMS = [
    { fx: 0.78, fy: 0.42, R: 0.17, ph: 0.0, drift: 0.6 },
    { fx: -0.01, fy: 1.05, R: 0.11, ph: 1.3, drift: 0.9 },
    { fx: 0.99, fy: 1.55, R: 0.13, ph: 2.1, drift: 0.7 },
    { fx: 0.02, fy: 2.05, R: 0.09, ph: 0.7, drift: 1.1 }
  ];
  var LOOP = 2.4; // in viewport heights
  var RIPPLE_PERIOD = 3.2;
  var RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffe14d', '#3ddc84', '#2f6bff', '#5b3bff', '#b44bff', '#ff4d6d'];
  var hasConic = typeof cx.createConicGradient === 'function';

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function rainbowStroke(x, y, rot) {
    var g;
    if (hasConic) {
      g = cx.createConicGradient(rot, x, y);
    } else {
      g = cx.createLinearGradient(x - 200, y - 200, x + 200, y + 200);
    }
    for (var i = 0; i < RAINBOW.length; i++) g.addColorStop(i / (RAINBOW.length - 1), RAINBOW[i]);
    return g;
  }

  function drawSystem(s, t, scrollY) {
    var unit = Math.min(W, H);
    var R = s.R * unit * (W < 720 ? 1.15 : 1);
    var span = H * LOOP;
    var y = s.fy * H - scrollY * 0.35 * s.drift;
    y = (((y + H * 0.4) % span) + span) % span - H * 0.4;
    var x = s.fx * W + Math.sin(t * 0.12 + s.ph) * unit * 0.03 - mouse.sx * 30 * s.drift;
    y += Math.cos(t * 0.1 + s.ph) * unit * 0.025 - mouse.sy * 20 * s.drift;
    if (y < -R * 3 || y > H + R * 3) return;

    var pulse = 1 + Math.sin(t * (Math.PI * 2 / RIPPLE_PERIOD) + s.ph) * 0.06;

    // soft halo
    var halo = cx.createRadialGradient(x, y, 0, x, y, R * 2.4);
    halo.addColorStop(0, 'rgba(47,107,255,0.30)');
    halo.addColorStop(0.4, 'rgba(120,165,255,0.14)');
    halo.addColorStop(1, 'rgba(239,233,223,0)');
    cx.fillStyle = halo;
    cx.beginPath();
    cx.arc(x, y, R * 2.4, 0, Math.PI * 2);
    cx.fill();

    // static rings
    cx.save();
    cx.globalAlpha = 0.55;
    cx.lineWidth = 2;
    cx.strokeStyle = rainbowStroke(x, y, t * 0.25 + s.ph);
    cx.beginPath();
    cx.arc(x, y, R * 1.0 * pulse, 0, Math.PI * 2);
    cx.stroke();
    cx.globalAlpha = 0.28;
    cx.lineWidth = 1;
    cx.strokeStyle = 'rgba(47,107,255,0.9)';
    cx.beginPath();
    cx.arc(x, y, R * 0.78, 0, Math.PI * 2);
    cx.stroke();
    cx.restore();

    // expanding ripples
    for (var k = 0; k < 3; k++) {
      var life = ((t + s.ph * 2) / RIPPLE_PERIOD + k / 3) % 1;
      var rr = R * (0.6 + life * 1.25);
      var a = Math.pow(1 - life, 1.6) * 0.7;
      cx.save();
      cx.globalAlpha = a;
      cx.lineWidth = 1 + (1 - life) * 2.2;
      cx.strokeStyle = rainbowStroke(x, y, -t * 0.4 + k);
      cx.beginPath();
      cx.arc(x, y, rr, 0, Math.PI * 2);
      cx.stroke();
      cx.restore();
    }

    // glowing core orb
    var cr = R * 0.5 * pulse;
    var core = cx.createRadialGradient(x - cr * 0.25, y - cr * 0.3, cr * 0.1, x, y, cr);
    core.addColorStop(0, 'rgba(170,200,255,1)');
    core.addColorStop(0.55, 'rgba(70,120,255,0.95)');
    core.addColorStop(1, 'rgba(40,90,240,0.85)');
    cx.save();
    cx.shadowColor = 'rgba(47,107,255,0.55)';
    cx.shadowBlur = R * 0.35;
    cx.fillStyle = core;
    cx.beginPath();
    cx.arc(x, y, cr, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
  }

  function drawBackground(t, scrollY) {
    cx.fillStyle = '#efe9df';
    cx.fillRect(0, 0, W, H);

    // warm light from the top left
    var wl = cx.createRadialGradient(W * 0.15, -H * 0.1, 0, W * 0.15, -H * 0.1, Math.max(W, H));
    wl.addColorStop(0, 'rgba(255,250,240,0.8)');
    wl.addColorStop(1, 'rgba(239,233,223,0)');
    cx.fillStyle = wl;
    cx.fillRect(0, 0, W, H);

    for (var i = 0; i < SYSTEMS.length; i++) drawSystem(SYSTEMS[i], t, scrollY);
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
     Galleries tilt toward the cursor (±4°); hero drifts with scroll
     --------------------------------------------------------------------- */
  var galleries = document.querySelectorAll('.gallery');
  var heroInner = document.querySelector('.hero-inner');

  function update3D() {
    var gx = (-mouse.sy * 8).toFixed(2) + 'deg';
    var gy = (mouse.sx * 8).toFixed(2) + 'deg';
    for (var i = 0; i < galleries.length; i++) {
      galleries[i].style.setProperty('--gx', gx);
      galleries[i].style.setProperty('--gy', gy);
    }
    if (heroInner) {
      var sy = window.scrollY;
      heroInner.style.transform = 'translate3d(0,' + (sy * 0.25).toFixed(1) + 'px,0)';
      heroInner.style.opacity = Math.max(0, 1 - sy / (window.innerHeight * 0.9)).toFixed(3);
    }
  }

  /* ---------------------------------------------------------------------
     Main loop
     --------------------------------------------------------------------- */
  var last = performance.now(), t = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;

    drawBackground(t, window.scrollY);
    prism.render(t);
    update3D();
    requestAnimationFrame(frame);
  }

  if (reduce) {
    drawBackground(0.8, 0);
    window.addEventListener('resize', function () { resize(); drawBackground(0.8, 0); });
  } else {
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('show');
          ro.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('show'); });
  }

  /* ---------------------------------------------------------------------
     Scroll progress + active section
     --------------------------------------------------------------------- */
  var bar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', function () {
    var s = document.documentElement;
    var max = s.scrollHeight - s.clientHeight;
    bar.style.width = (max > 0 ? s.scrollTop / max * 100 : 0) + '%';
  }, { passive: true });

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
