/* ==========================================================================
   de34-page.js — DOM motion for the de34 open-world page
   (the 3D world itself lives in de34-world.js)

   - monumental words slide in sync with scroll
   - sections rise out of depth; galleries tilt toward the cursor (±4°)
   - scroll progress bar, dot navigation
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var words = Array.prototype.slice.call(document.querySelectorAll('.mono-word'));
  var galleries = document.querySelectorAll('.gallery');
  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function slideWords() {
    var vh = window.innerHeight, vw = window.innerWidth;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var r = w.parentNode.getBoundingClientRect();
      var q = (vh - r.top) / (vh + r.height); // 0 entering .. 1 leaving
      var dir = parseFloat(w.getAttribute('data-slide')) || 1;
      w.style.setProperty('--slide', ((0.5 - q) * dir * vw * 0.42).toFixed(1) + 'px');
    }
  }

  /* Reveal is tied to scroll position — the same input the 3D camera uses —
     instead of IntersectionObserver + timed transitions, which let the tabs
     arrive late or out of step with the world on fast scrolls. */
  var stations = Array.prototype.slice.call(document.querySelectorAll('.station')).map(function (st) {
    return { el: st, items: Array.prototype.slice.call(st.querySelectorAll('.reveal')) };
  });
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function revealByScroll() {
    var vh = window.innerHeight;
    for (var i = 0; i < stations.length; i++) {
      var st = stations[i];
      var top = st.el.getBoundingClientRect().top;
      // 0 when the station's top is near the bottom of the screen,
      // 1 once it has reached the upper third (before the camera arrives)
      var q = clamp01((vh * 0.95 - top) / (vh * 0.6));
      for (var k = 0; k < st.items.length; k++) {
        var v = clamp01(q * 1.5 - k * 0.16);      // gentle stagger by order
        v = 1 - Math.pow(1 - v, 3);                // ease-out
        st.items[k].style.setProperty('--in', v.toFixed(3));
      }
    }
  }

  function tick() {
    // hold the gallery still while a tab is hovered, so the tab doesn't move
    // under the cursor
    if (!document.documentElement.classList.contains('glass-hover')) {
      mouse.sx += (mouse.x - mouse.sx) * 0.06;
      mouse.sy += (mouse.y - mouse.sy) * 0.06;
    }
    var gx = (-mouse.sy * 8).toFixed(2) + 'deg';
    var gy = (mouse.sx * 8).toFixed(2) + 'deg';
    for (var i = 0; i < galleries.length; i++) {
      galleries[i].style.setProperty('--gx', gx);
      galleries[i].style.setProperty('--gy', gy);
    }
    slideWords();
    revealByScroll();
    requestAnimationFrame(tick);
  }

  if (reduce) {
    slideWords();
    window.addEventListener('scroll', slideWords, { passive: true });
  } else {
    revealByScroll();
    requestAnimationFrame(tick);
  }

  /* glass tabs must work even if the 3D world cannot load (offline CDN,
     no WebGL): bind them with a placeholder source; de34-world.js swaps in
     its canvas when it starts. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (window.__de34Prism || !window.GlassPrism) return;
      window.__de34Prism = GlassPrism.init({
        source: document.createElement('canvas'),
        stage: document.getElementById('world'),
        overlay: true
      });
    }, 1200);
  });

  /* reduced motion: everything is simply visible (CSS sets opacity 1) */
  if (reduce) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.style.setProperty('--in', '1'); });
  }

  /* scroll progress */
  var bar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', function () {
    var s = document.documentElement;
    var max = s.scrollHeight - s.clientHeight;
    bar.style.width = (max > 0 ? s.scrollTop / max * 100 : 0) + '%';
  }, { passive: true });

  /* active section */
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
