/* ==========================================================================
   glass-prism.js — shared "glass tab" interaction for XBP pages

   What it does
   - Re-renders the page's animated background (a 2D <canvas>) through a
     WebGL layer. Under the hovered glass tab the background is bent like a
     lens around the cursor and split into the 7 colours of light
     (red, orange, yellow, green, blue, indigo, violet).
   - Tilts glass tabs in 3D toward the cursor (max ±8° by default).
   - Touch devices: a weak pulse on tap and on scroll.
   - No WebGL → the CSS fallback (backdrop blur + 7-colour conic rim) is used.

   Usage (from a page script, after the background canvas exists):
     const prism = GlassPrism.init({ source: bgCanvas, stage: bgStageEl });
     // in the page's animation loop, after drawing the background:
     prism.render(timeInSeconds);

   Elements:
     .glass[data-prism]     → refracts the background on hover
     [data-tilt]            → 3D tilt toward the cursor; value = max degrees
   ========================================================================== */
(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Coordinates are in CSS pixels with a top-left origin.
  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2  uRes;',      // viewport size (css px)
    'uniform vec4  uRect;',     // hovered tab: x, y, w, h (css px)
    'uniform float uRadius;',   // tab corner radius
    'uniform vec2  uMouse;',    // cursor (css px)
    'uniform float uStrength;', // 0..1 eased hover amount
    'uniform float uTime;',

    'float sdRoundRect(vec2 p, vec2 b, float r){',
    '  vec2 q = abs(p) - b + r;',
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;',
    '}',

    'vec3 sampleBg(vec2 px){',
    '  vec2 uv = clamp(px / uRes, vec2(0.001), vec2(0.999));',
    '  return texture2D(uTex, uv).rgb;',
    '}',

    // 7 spectral colours: red, orange, yellow, green, blue, indigo, violet
    'vec3 spectral(int i){',
    '  if (i == 0) return vec3(1.00, 0.00, 0.00);',
    '  if (i == 1) return vec3(1.00, 0.50, 0.00);',
    '  if (i == 2) return vec3(1.00, 1.00, 0.00);',
    '  if (i == 3) return vec3(0.00, 1.00, 0.00);',
    '  if (i == 4) return vec3(0.00, 0.45, 1.00);',
    '  if (i == 5) return vec3(0.29, 0.00, 1.00);',
    '  return vec3(0.60, 0.00, 1.00);',
    '}',

    'void main(){',
    '  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);',
    '  vec3 base = sampleBg(px);',
    '  if (uStrength < 0.002) { gl_FragColor = vec4(base, 1.0); return; }',

    '  vec2 hs = uRect.zw * 0.5;',
    '  vec2 center = uRect.xy + hs;',
    '  float d = sdRoundRect(px - center, hs, uRadius);',
    '  float inside = smoothstep(1.5, -1.5, d);',
    '  if (inside <= 0.0) { gl_FragColor = vec4(base, 1.0); return; }',

    // lens bulge around the cursor
    '  float lensR = max(min(uRect.z, uRect.w) * 0.75, 120.0);',
    '  vec2 rel = (px - uMouse) / lensR;',
    '  float fall = exp(-dot(rel, rel) * 1.8);',
    '  vec2 lens = -(px - uMouse) * 0.28 * fall;',

    // edge refraction: light bends strongly near the tab border
    '  float edge = 1.0 - smoothstep(0.0, 46.0, -d);',
    '  vec2 nrm = normalize(px - center + 0.0001) * vec2(hs.y / max(hs.x, 1.0), 1.0);',
    '  vec2 bend = -normalize(nrm) * edge * edge * 22.0;',

    // slow liquid wobble so the glass feels alive
    '  vec2 wob = vec2(sin(px.y * 0.025 + uTime * 1.3), cos(px.x * 0.022 - uTime * 1.1)) * 2.2;',

    '  vec2 offset = (lens + bend + wob) * uStrength;',
    '  float disp = (0.55 + edge * 0.9 + fall * 0.6);',

    // dispersion: 7 wavelength samples, each tinted with its spectral colour
    '  vec3 acc = vec3(0.0);',
    '  for (int i = 0; i < 7; i++) {',
    '    float k = 1.0 + (float(i) - 3.0) * 0.075 * disp;',
    '    acc += sampleBg(px + offset * k) * spectral(i);',
    '  }',
    '  vec3 refr = acc / vec3(3.89, 2.95, 3.0);',

    // thin rainbow caustic on the rim, rotating with the cursor angle
    '  float ang = atan(px.y - uMouse.y, px.x - uMouse.x) / 6.28318 + 0.5 + uTime * 0.05;',
    '  int band = int(mod(floor(ang * 7.0), 7.0));',
    '  float rim = (1.0 - smoothstep(0.0, 3.5, abs(d + 2.0))) * 0.55;',
    '  refr = mix(refr, spectral(band) * 0.85 + 0.1, clamp(rim * uStrength * 0.9, 0.0, 1.0));',
    '  refr += vec3(1.0) * fall * 0.05 * uStrength;',

    '  gl_FragColor = vec4(mix(base, refr, inside), 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
    }
    return s;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function GlassPrism(opts) {
    this.source = opts.source;
    this.stage = opts.stage || this.source.parentNode;
    this.maxDpr = opts.maxDpr || 1.5;
    this.selector = opts.selector || '.glass[data-prism]';
    this.active = null;
    this.mouse = { x: -9999, y: -9999 };
    this.smooth = { x: -9999, y: -9999 };
    this.strength = 0;
    this.target = 0;
    this.gl = null;
    this.ok = false;

    if (!reduceMotion) this._initGL();
    this._bindPointer();
    this._bindTilt();
  }

  GlassPrism.prototype._initGL = function () {
    var canvas = document.createElement('canvas');
    canvas.id = 'prism-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var gl;
    try {
      gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: false }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return;

    try {
      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this.u = {};
      var names = ['uTex', 'uRes', 'uRect', 'uRadius', 'uMouse', 'uStrength', 'uTime'];
      for (var i = 0; i < names.length; i++) this.u[names[i]] = gl.getUniformLocation(prog, names[i]);
      gl.uniform1i(this.u.uTex, 0);
    } catch (err) {
      if (global.console) console.warn('[glass-prism] WebGL disabled:', err.message);
      return;
    }

    this.gl = gl;
    this.canvas = canvas;
    this.stage.appendChild(canvas);
    document.documentElement.classList.add('prism-on');
    this.ok = true;

    var self = this;
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self.ok = false;
      document.documentElement.classList.remove('prism-on');
    });
    this._resize();
    global.addEventListener('resize', function () { self._resize(); });
  };

  GlassPrism.prototype._resize = function () {
    if (!this.canvas) return;
    var dpr = Math.min(global.devicePixelRatio || 1, this.maxDpr);
    this.w = global.innerWidth;
    this.h = global.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };

  GlassPrism.prototype._setActive = function (el, x, y, strength) {
    this.active = el;
    this.mouse.x = x;
    this.mouse.y = y;
    if (this.smooth.x < -9000) { this.smooth.x = x; this.smooth.y = y; }
    this.target = strength;
  };

  GlassPrism.prototype._bindPointer = function () {
    var self = this;
    var els = document.querySelectorAll(this.selector);

    Array.prototype.forEach.call(els, function (el) {
      el.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        self._setActive(el, e.clientX, e.clientY, 1);
        el.classList.add('is-hover');
      });
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        self.mouse.x = e.clientX;
        self.mouse.y = e.clientY;
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        var a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        el.style.setProperty('--prism-angle', (a * 57.2958).toFixed(1) + 'deg');
      });
      el.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        el.classList.remove('is-hover');
        if (self.active === el) self.target = 0;
      });
      // touch: short, weak pulse on tap
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'touch') return;
        self._setActive(el, e.clientX, e.clientY, 0.6);
        self._touchUntil = performance.now() + 650;
      });
    });

    // touch: weak refraction on the tab nearest the centre while scrolling
    if (coarse) {
      var tick = false;
      global.addEventListener('scroll', function () {
        if (tick) return;
        tick = true;
        requestAnimationFrame(function () {
          tick = false;
          var cy = global.innerHeight / 2, best = null, bestD = 1e9;
          Array.prototype.forEach.call(els, function (el) {
            var r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > global.innerHeight) return;
            var dd = Math.abs(r.top + r.height / 2 - cy);
            if (dd < bestD) { bestD = dd; best = el; }
          });
          if (best) {
            var r = best.getBoundingClientRect();
            self._setActive(best, r.left + r.width * 0.5, r.top + r.height * 0.4, 0.35);
            self._touchUntil = performance.now() + 420;
          }
        });
      }, { passive: true });
    }
  };

  GlassPrism.prototype._bindTilt = function () {
    if (reduceMotion || coarse) return;
    var els = document.querySelectorAll('[data-tilt]');
    Array.prototype.forEach.call(els, function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 8;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--tilt-x', (-y * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--tilt-y', (x * 2 * max).toFixed(2) + 'deg');
        el.classList.add('is-hover');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.classList.remove('is-hover');
      });
    });
  };

  /** Call once per frame after the background canvas has been drawn. */
  GlassPrism.prototype.render = function (time) {
    if (this._touchUntil && performance.now() > this._touchUntil) {
      this.target = 0;
      this._touchUntil = 0;
    }
    this.strength = lerp(this.strength, this.target, 0.09);
    this.smooth.x = lerp(this.smooth.x, this.mouse.x, 0.12);
    this.smooth.y = lerp(this.smooth.y, this.mouse.y, 0.12);
    if (!this.ok) return;

    var gl = this.gl, u = this.u;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.source);
    gl.uniform2f(u.uRes, this.w, this.h);
    gl.uniform1f(u.uTime, time || 0);

    var s = this.strength;
    if (this.active && s > 0.002) {
      var r = this.active.getBoundingClientRect();
      var radius = parseFloat(getComputedStyle(this.active).borderTopLeftRadius) || 24;
      gl.uniform4f(u.uRect, r.left, r.top, r.width, r.height);
      gl.uniform1f(u.uRadius, Math.min(radius, r.width / 2, r.height / 2));
      gl.uniform2f(u.uMouse, this.smooth.x, this.smooth.y);
      gl.uniform1f(u.uStrength, s);
    } else {
      gl.uniform1f(u.uStrength, 0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  global.GlassPrism = {
    init: function (opts) { return new GlassPrism(opts); },
    reduceMotion: reduceMotion,
    coarse: coarse
  };
})(window);
