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

  function tick() {
    mouse.sx += (mouse.x - mouse.sx) * 0.06;
    mouse.sy += (mouse.y - mouse.sy) * 0.06;
    var gx = (-mouse.sy * 8).toFixed(2) + 'deg';
    var gy = (mouse.sx * 8).toFixed(2) + 'deg';
    for (var i = 0; i < galleries.length; i++) {
      galleries[i].style.setProperty('--gx', gx);
      galleries[i].style.setProperty('--gy', gy);
    }
    slideWords();
    requestAnimationFrame(tick);
  }

  if (reduce) {
    slideWords();
    window.addEventListener('scroll', slideWords, { passive: true });
  } else {
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

  /* reveal */
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
