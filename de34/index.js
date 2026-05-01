const OCTA_FORCE_ANIMATION = (() => {
  const root = document.documentElement;

  const style = document.createElement("style");
  style.textContent = `
    .force-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 4;
      overflow: hidden;
      mix-blend-mode: screen;
    }

    .force-particle {
      position: absolute;
      width: var(--size);
      height: var(--size);
      left: 50%;
      top: 50%;
      border-radius: 999px;
      background:
        radial-gradient(circle, rgba(255,255,255,.95), rgba(111,184,255,.62) 38%, transparent 72%);
      box-shadow:
        0 0 18px rgba(111,184,255,.62),
        0 0 42px rgba(111,184,255,.22);
      transform:
        translate(-50%, -50%)
        rotate(var(--angle))
        translateX(var(--distance))
        scale(var(--scale));
      opacity: var(--opacity);
      animation: particleWarp var(--duration) cubic-bezier(.16, 1, .3, 1) infinite;
      animation-delay: var(--delay);
    }

    .force-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: var(--ring-size);
      height: var(--ring-size);
      border-radius: 50%;
      border: 1px solid rgba(185,221,255,.32);
      box-shadow:
        inset 0 0 28px rgba(111,184,255,.18),
        0 0 42px rgba(111,184,255,.18);
      transform: translate(-50%, -50%) rotateX(68deg) rotateZ(var(--ring-rotate));
      animation: ringPulse var(--ring-speed) cubic-bezier(.16, 1, .3, 1) infinite;
      animation-delay: var(--ring-delay);
    }

    .force-slice {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 2px;
      height: 120vh;
      background: linear-gradient(
        to bottom,
        transparent,
        rgba(255,255,255,.0),
        rgba(185,221,255,.75),
        rgba(111,184,255,.18),
        transparent
      );
      transform-origin: center;
      transform:
        translate(-50%, -50%)
        rotate(var(--slice-rotate))
        translateY(var(--slice-offset));
      opacity: .0;
      animation: sliceFlash var(--slice-speed) linear infinite;
      animation-delay: var(--slice-delay);
    }

    .force-shockwave {
      position: fixed;
      left: var(--x);
      top: var(--y);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(185,221,255,.78);
      box-shadow:
        0 0 30px rgba(111,184,255,.55),
        inset 0 0 28px rgba(255,255,255,.18);
      transform: translate(-50%, -50%) scale(0);
      animation: shockwave .8s cubic-bezier(.16, 1, .3, 1) forwards;
      pointer-events: none;
      z-index: 50;
      mix-blend-mode: screen;
    }

    .course-card.force-active {
      transform: translateY(-10px) scale(1.025) rotateX(3deg);
      border-color: rgba(185,221,255,.68);
      box-shadow:
        0 30px 100px rgba(0,0,0,.58),
        0 0 80px rgba(111,184,255,.18);
    }

    .course-card.force-active::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      background:
        linear-gradient(120deg, transparent 10%, rgba(255,255,255,.34), transparent 42%),
        radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(111,184,255,.28), transparent 38%);
      opacity: .9;
      animation: cardBurst .75s cubic-bezier(.16, 1, .3, 1) forwards;
      pointer-events: none;
    }

    .hero-left.force-title-hit h1 {
      animation: titleImpact .74s cubic-bezier(.16, 1, .3, 1) both;
    }

    .hero-left.force-title-hit .title-slice::after {
      animation: chromaticTear .74s cubic-bezier(.16, 1, .3, 1) both;
    }

    @keyframes particleWarp {
      0% {
        opacity: 0;
        transform:
          translate(-50%, -50%)
          rotate(var(--angle))
          translateX(24px)
          scale(.18);
        filter: blur(10px);
      }
      18% {
        opacity: var(--opacity);
      }
      58% {
        filter: blur(0px);
      }
      100% {
        opacity: 0;
        transform:
          translate(-50%, -50%)
          rotate(var(--angle))
          translateX(var(--distance))
          scale(var(--scale));
        filter: blur(5px);
      }
    }

    @keyframes ringPulse {
      0% {
        opacity: 0;
        transform:
          translate(-50%, -50%)
          rotateX(68deg)
          rotateZ(var(--ring-rotate))
          scale(.18);
        filter: blur(8px);
      }
      24% {
        opacity: .95;
      }
      100% {
        opacity: 0;
        transform:
          translate(-50%, -50%)
          rotateX(68deg)
          rotateZ(calc(var(--ring-rotate) + 90deg))
          scale(1.7);
        filter: blur(0px);
      }
    }

    @keyframes sliceFlash {
      0%, 68% {
        opacity: 0;
        transform:
          translate(-50%, -50%)
          rotate(var(--slice-rotate))
          translateY(80vh)
          scaleY(.3);
      }
      72% {
        opacity: .9;
      }
      100% {
        opacity: 0;
        transform:
          translate(-50%, -50%)
          rotate(var(--slice-rotate))
          translateY(-80vh)
          scaleY(1.2);
      }
    }

    @keyframes shockwave {
      0% {
        opacity: .95;
        transform: translate(-50%, -50%) scale(0);
        filter: blur(0px);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(24);
        filter: blur(6px);
      }
    }

    @keyframes cardBurst {
      0% {
        opacity: 0;
        transform: scale(.94);
        filter: blur(10px);
      }
      30% {
        opacity: .95;
      }
      100% {
        opacity: 0;
        transform: scale(1.08);
        filter: blur(0px);
      }
    }

    @keyframes titleImpact {
      0% {
        transform: translate3d(0,0,0) scale(1);
        filter: blur(0);
      }
      24% {
        transform: translate3d(-10px,4px,0) scale(1.035);
        filter: blur(.4px);
      }
      42% {
        transform: translate3d(12px,-3px,0) scale(.992);
      }
      64% {
        transform: translate3d(-4px,1px,0) scale(1.01);
      }
      100% {
        transform: translate3d(0,0,0) scale(1);
        filter: blur(0);
      }
    }

    @keyframes chromaticTear {
      0% {
        transform: translateX(7px);
        opacity: .7;
      }
      28% {
        transform: translateX(22px) skewX(-12deg);
        opacity: 1;
      }
      56% {
        transform: translateX(-14px) skewX(8deg);
      }
      100% {
        transform: translateX(7px);
        opacity: .7;
      }
    }
  `;
  document.head.appendChild(style);

  const layer = document.createElement("div");
  layer.className = "force-layer";
  document.body.appendChild(layer);

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createParticles(count = 90) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("i");
      particle.className = "force-particle";

      particle.style.setProperty("--angle", `${random(0, 360)}deg`);
      particle.style.setProperty("--distance", `${random(220, 920)}px`);
      particle.style.setProperty("--size", `${random(2, 9)}px`);
      particle.style.setProperty("--scale", `${random(.6, 1.8)}`);
      particle.style.setProperty("--opacity", `${random(.28, .92)}`);
      particle.style.setProperty("--duration", `${random(2.4, 6.8)}s`);
      particle.style.setProperty("--delay", `${random(-6, 0)}s`);

      fragment.appendChild(particle);
    }

    layer.appendChild(fragment);
  }

  function createRings(count = 9) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const ring = document.createElement("i");
      ring.className = "force-ring";

      ring.style.setProperty("--ring-size", `${180 + i * 82}px`);
      ring.style.setProperty("--ring-rotate", `${i * 18}deg`);
      ring.style.setProperty("--ring-speed", `${3.2 + i * .34}s`);
      ring.style.setProperty("--ring-delay", `${i * -.38}s`);

      fragment.appendChild(ring);
    }

    layer.appendChild(fragment);
  }

  function createSlices(count = 18) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const slice = document.createElement("i");
      slice.className = "force-slice";

      slice.style.setProperty("--slice-rotate", `${i * (180 / count)}deg`);
      slice.style.setProperty("--slice-offset", `${random(-80, 80)}px`);
      slice.style.setProperty("--slice-speed", `${random(3.6, 7.2)}s`);
      slice.style.setProperty("--slice-delay", `${random(-7, 0)}s`);

      fragment.appendChild(slice);
    }

    layer.appendChild(fragment);
  }

  function shockwave(x, y) {
    const wave = document.createElement("i");
    wave.className = "force-shockwave";
    wave.style.setProperty("--x", `${x}px`);
    wave.style.setProperty("--y", `${y}px`);

    document.body.appendChild(wave);

    window.setTimeout(() => {
      wave.remove();
    }, 900);
  }

  function bindCardImpact() {
    const cards = document.querySelectorAll(".course-card");

    cards.forEach((card) => {
      card.addEventListener("mouseenter", (event) => {
        card.classList.add("force-active");
        shockwave(event.clientX, event.clientY);
      });

      card.addEventListener("mouseleave", () => {
        card.classList.remove("force-active");
      });

      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        card.style.setProperty("--mx", `${x}%`);
        card.style.setProperty("--my", `${y}%`);
      });
    });
  }

  function bindTitleImpact() {
    const heroLeft = document.querySelector(".hero-left");

    if (!heroLeft) return;

    heroLeft.addEventListener("mouseenter", (event) => {
      heroLeft.classList.remove("force-title-hit");
      void heroLeft.offsetWidth;
      heroLeft.classList.add("force-title-hit");
      shockwave(event.clientX, event.clientY);
    });

    heroLeft.addEventListener("animationend", (event) => {
      if (event.animationName === "titleImpact") {
        heroLeft.classList.remove("force-title-hit");
      }
    });
  }

  function bindClickBurst() {
    window.addEventListener("click", (event) => {
      const isInteractive = event.target.closest("a, button, .course-card, .hero-left");
      if (!isInteractive) return;
      shockwave(event.clientX, event.clientY);
    });
  }

  function init() {
    createParticles(110);
    createRings(10);
    createSlices(22);
    bindCardImpact();
    bindTitleImpact();
    bindClickBurst();
  }

  init();

  return {
    refresh() {
      layer.innerHTML = "";
      createParticles(110);
      createRings(10);
      createSlices(22);
    },

    burst(x = window.innerWidth / 2, y = window.innerHeight / 2) {
      shockwave(x, y);
    }
  };
})();