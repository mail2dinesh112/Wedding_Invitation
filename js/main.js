/* ==========================================================================
   Wedding invitation — flow controller
   lamp → invitation card → temple → countdown → gratitude
   ========================================================================== */
(() => {
  'use strict';

  /* ---- Configuration ---------------------------------------------------- */

  const CONFIG = {
    weddingTime: Date.parse('2026-12-14T06:15:00+05:30'),
    swipeThresholdPx: 45,
    wheelThreshold: 16,

    // Milliseconds. `reduced` is used when the visitor prefers reduced motion.
    timing: {
      full: { lampToHero: 4000, templeReady: 2500 },
      reduced: { lampToHero: 1500, templeReady: 100 },
    },

    // Flame anchors: x / y = base of the flame as a % of the 2:3 scene image,
    // size = scale, delay = ignition delay (s), flicker = period (s), offset = phase (s).
    flames: [
      { x: 49.9, y: 43.1, size: 1,    delay: .2,  flicker: 1.1, offset: -.2 },
      { x: 42.8, y: 43.2, size: 1.15, delay: .65, flicker: 1.7, offset: -.9 },
      { x: 56.9, y: 43.2, size: 1.05, delay: .85, flicker: 1.4, offset: -.5 },
      { x: 37.9, y: 43.5, size: 1,    delay: 1.2, flicker: 1.9, offset: -1.3 },
      { x: 61.8, y: 43.8, size: .8,   delay: 1.4, flicker: 1.5, offset: -.7 },
    ],

    embers: { max: 5, firstDelay: 1200, minGap: 900, maxGap: 2100 },
  };

  // Spoken to screen readers as each screen appears.
  const TEXT = {
    lit: 'குத்துவிளக்கு ஏற்றப்பட்டது',
    hero: 'Welcome to the wedding of Dineshkumar and Suthesi',
    temple: 'குமாரவயலூர் அருள்மிகு திருக்கோயில்',
    countdown: 'திருமண நாளை நோக்கி',
    gratitude: 'தங்கள் வருகையை அன்புடன் எதிர்நோக்குகிறோம்',
  };

  /* ---- Helpers ---------------------------------------------------------- */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const rand = (min, span) => min + Math.random() * span;   // random in [min, min + span)
  const pad = (n) => String(n).padStart(2, '0');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timing = reduceMotion ? CONFIG.timing.reduced : CONFIG.timing.full;

  const scene = $('scene');
  const announce = (message) => { $('status').textContent = message; };
  const hasState = (name) => scene.classList.contains(name);

  /** Fit a canvas to its CSS size at device resolution (capped at 2×); returns its size in CSS px. */
  function fitCanvas(canvas, ctx) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth: width, clientHeight: height } = canvas;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  if (window.CSS && CSS.registerProperty && !reduceMotion) scene.classList.add('has-bloom');

  /* ---- Lamp: flames & embers ------------------------------------------- */

  function buildFlames() {
    const container = $('flames');

    for (const f of CONFIG.flames) {
      const flame = document.createElement('div');
      flame.className = 'flame';
      flame.style.cssText =
        `--x:${f.x}%;--y:${f.y}%;--s:${f.size};--d:${f.delay}s;--fd:${f.flicker}s;--fo:${f.offset}s`;

      const halo = document.createElement('i');
      halo.className = 'halo';

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'core');
      svg.setAttribute('viewBox', '0 0 20 40');
      const use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#flame-shape');
      use.setAttribute('fill', 'url(#fg)');
      svg.append(use);

      const sway = document.createElement('div');
      sway.className = 'sway';
      sway.append(svg);

      flame.append(halo, sway);
      container.append(flame);
    }
  }

  const embers = (() => {
    const layer = $('embers');
    const stage = $('stage');
    const { max, firstDelay, minGap, maxGap } = CONFIG.embers;
    let timer = null;

    function spawn() {
      if (layer.childElementCount < max) {
        const stageHeight = stage.getBoundingClientRect().height;
        const el = document.createElement('span');
        el.className = 'ember';
        el.style.setProperty('--ex', `${rand(38, 24).toFixed(1)}%`);
        el.style.setProperty('--ey', `${rand(41.5, 2).toFixed(1)}%`);
        el.style.setProperty('--es', `${rand(1.2, 1.3).toFixed(1)}px`);
        el.style.setProperty('--et', `${rand(4, 2.5).toFixed(2)}s`);
        el.style.setProperty('--edx', `${rand(-15, 30).toFixed(0)}px`);
        el.style.setProperty('--edy', `${(-rand(.05, .06) * stageHeight).toFixed(0)}px`);
        el.addEventListener('animationend', () => el.remove(), { once: true });
        layer.append(el);
      }
      timer = setTimeout(spawn, rand(minGap, maxGap - minGap));
    }

    return {
      start() { if (timer === null) timer = setTimeout(spawn, firstDelay); },
      stop() { clearTimeout(timer); timer = null; },
    };
  })();

  /* ---- Countdown -------------------------------------------------------- */

  const countdown = (() => {
    // [element, unit length in ms, wrap-around] — days never wrap.
    const UNITS = [
      ['days', 864e5, Infinity],
      ['hours', 36e5, 24],
      ['minutes', 6e4, 60],
      ['seconds', 1e3, 60],
    ].map(([unit, ms, wrap]) => [document.querySelector(`[data-unit="${unit}"]`), ms, wrap]);
    let interval = null;

    function render() {
      const remaining = Math.max(0, CONFIG.weddingTime - Date.now());
      for (const [el, ms, wrap] of UNITS) el.textContent = pad(Math.floor(remaining / ms) % wrap);
      if (remaining === 0) stop();
    }

    function start() {
      render();
      if (interval === null && Date.now() < CONFIG.weddingTime) interval = setInterval(render, 1000);
    }

    function stop() {
      clearInterval(interval);
      interval = null;
    }

    // Don't tick in a background tab; catch up instantly on return.
    document.addEventListener('visibilitychange', () => {
      if (!hasState('to-countdown')) return;
      if (document.hidden) stop(); else start();
    });

    return { start };
  })();

  /* ---- Petal shower ----------------------------------------------------- */

  const petals = (() => {
    const canvas = $('petalCanvas');
    const ctx = canvas.getContext('2d');
    const COLORS = ['#ff9f1c', '#ffb703', '#ffd166', '#fff4d6', '#ffffff', '#ff8fab'];
    const BURST = reduceMotion ? 12 : 55;

    let width = 0;
    let height = 0;
    let list = [];
    let frame = 0;

    const fit = () => ({ width, height } = fitCanvas(canvas, ctx));

    function drawPetal(p) {
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(Math.cos(p.flip), 1);               // fake 3-D tumble
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, (height - p.y) / 60 + .15) * .95;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * .9, -s * .4, s * .7, s * .8, 0, s);
      ctx.bezierCurveTo(-s * .7, s * .8, -s * .9, -s * .4, 0, -s);
      ctx.fill();
      ctx.restore();
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);
      list = list.filter((p) => p.y < height + 20);
      for (const p of list) {
        p.vy = Math.min(p.vy + .035, 2.1);
        p.x += p.vx + Math.sin(p.y / 28 + p.phase) * .55;
        p.y += p.vy;
        p.rot += p.spin;
        p.flip += p.flipSpeed;
        drawPetal(p);
      }
      frame = list.length ? requestAnimationFrame(tick) : 0;
    }

    function burst(count = BURST) {
      if (!width) fit();
      for (let i = 0; i < count; i++) {
        list.push({
          x: rand(0, width),
          y: -12 - rand(0, height * .25),
          vx: rand(-.35, .7),
          vy: rand(0, 1.1),
          size: rand(5, 6),
          rot: rand(0, Math.PI * 2),
          spin: rand(-.035, .07),
          flip: rand(0, Math.PI),
          flipSpeed: rand(.02, .05),
          phase: rand(0, Math.PI * 2),
          color: COLORS[i % COLORS.length],
        });
      }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    $('petalButton').addEventListener('click', () => burst());
    new ResizeObserver(fit).observe(canvas);

    return {
      // A welcome shower when the screen opens, after its content has faded in.
      welcome() { if (!reduceMotion) setTimeout(() => burst(70), 700); },
    };
  })();

  /* ---- Poem: water-ripple settle ---------------------------------------- */

  // Each poem line gets an SVG displacement filter whose strength eases from "rippling" to
  // zero while the line fades in (CSS handles the fade/blur). The filter is removed afterwards.
  const poemWater = (() => {
    const RIPPLE = { start: 20, duration: 2600 };
    const lines = [...document.querySelectorAll('.temple-poem-line')];

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = lines.map((_, i) => `
      <filter id="poemWater${i}" x="-5%" y="-40%" width="110%" height="180%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.11" numOctaves="2" seed="${i + 2}" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${RIPPLE.start}" xChannelSelector="R" yChannelSelector="G"/>
      </filter>`).join('');
    document.body.append(svg);

    function ripple(line, i) {
      const text = line.querySelector('.glass-text');
      const displace = svg.querySelector(`#poemWater${i} feDisplacementMap`);
      text.style.filter = `url(#poemWater${i})`;
      const begin = performance.now();
      (function step(now) {
        const t = Math.min(1, (now - begin) / RIPPLE.duration);
        displace.setAttribute('scale', (RIPPLE.start * (1 - t) ** 2).toFixed(2));
        if (t < 1) requestAnimationFrame(step); else text.style.filter = '';
      })(begin);
    }

    return {
      start() {
        if (reduceMotion) return;
        lines.forEach((line, i) => setTimeout(() => ripple(line, i), 1300 + i * 600));
      },
    };
  })();

  /* ---- Swipe up --------------------------------------------------------- */

  const isInteractive = (target) =>
    target instanceof Element && target.closest('a, button, [role="button"]');
  const isSwipeHint = (target) => target instanceof Element && target.closest('.swipe-hint');

  /**
   * Makes `screen` advance via any of: an upward swipe (touch / pen / mouse drag), scrolling
   * down, or selecting its "swipe up" hint. Screens are touch-action:none, so pointer events
   * cover every input type. Links and buttons never start a swipe, except the hint itself.
   */
  function bindSwipeUp(screen, { canSwipe, onSwipe }) {
    let start = null;

    const isUpwardSwipe = (event) => {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      return dy < -CONFIG.swipeThresholdPx && -dy > Math.abs(dx);   // far enough, and mostly vertical
    };

    screen.addEventListener('pointerdown', (event) => {
      const allowed = event.isPrimary && canSwipe() && (!isInteractive(event.target) || isSwipeHint(event.target));
      start = allowed ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
      // Capturing on a button would redirect its click to the screen and break the hint's tap.
      if (allowed && !isInteractive(event.target)) {
        try { screen.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
      }
    });
    screen.addEventListener('pointermove', (event) => {
      if (start && event.pointerId === start.id && isUpwardSwipe(event)) { start = null; onSwipe(); }
    });
    screen.addEventListener('pointerup', (event) => {
      if (start && event.pointerId === start.id && isUpwardSwipe(event)) onSwipe();
      start = null;
    });
    screen.addEventListener('pointercancel', () => { start = null; });

    screen.addEventListener('wheel', (event) => {
      if (canSwipe() && event.deltaY > CONFIG.wheelThreshold && !isInteractive(event.target)) onSwipe();
    }, { passive: true });

    screen.querySelector('.swipe-hint')?.addEventListener('click', () => onSwipe());
  }

  /* ---- Screen flow ------------------------------------------------------ */

  (() => {
    let templeStarted = false;
    let templeReady = false;

    function makeHeroPetals(count = 18) {
      const layer = $('heroPetals');
      layer.replaceChildren();
      if (reduceMotion) return;

      for (let i = 0; i < count; i++) {
        const petal = document.createElement('span');
        const size = rand(6, 8);
        petal.className = 'hero-petal';
        petal.style.cssText =
          `width:${size}px;height:${size * .8}px;left:${rand(0, 100)}%;` +
          `--petal-drift:${rand(-40, 80)}px;animation-duration:${rand(9, 8)}s;animation-delay:${rand(6, 10)}s`;
        layer.append(petal);
      }
    }

    function lightLamp() {
      scene.classList.add('is-lit');
      $('lampTarget').disabled = true;
      announce(TEXT.lit);
      const bgm = $('bgm');
      bgm.currentTime = 0;
      bgm.play().catch((error) => console.warn('Background music could not start:', error));
      try { navigator.vibrate?.(30); } catch { /* vibration is optional */ }
      if (!reduceMotion) embers.start();
      setTimeout(showHero, timing.lampToHero);
    }

    function showHero() {
      embers.stop();
      makeHeroPetals();
      scene.classList.add('to-hero');
      announce(TEXT.hero);
    }

    function showTemple() {
      if (templeStarted) return;
      templeStarted = true;
      scene.classList.add('to-temple');
      announce(TEXT.temple);
      poemWater.start();
      setTimeout(() => {
        templeReady = true;
        scene.classList.add('temple-ready');
      }, timing.templeReady);
    }

    function showCountdown() {
      if (!templeReady || hasState('to-countdown')) return;
      scene.classList.add('to-countdown');
      announce(TEXT.countdown);
      countdown.start();
    }

    function showGratitude() {
      if (!hasState('to-countdown')) return;
      const firstVisit = !hasState('seen-gratitude');
      scene.classList.add('to-gratitude', 'seen-gratitude');
      announce(TEXT.gratitude);
      if (firstVisit) petals.welcome();
    }

    function backToCountdown() {
      scene.classList.remove('to-gratitude');
      announce(TEXT.countdown);
    }

    bindSwipeUp($('hero'), {
      canSwipe: () => hasState('to-hero') && !hasState('to-temple'),
      onSwipe: showTemple,
    });
    bindSwipeUp($('templeScreen'), { canSwipe: () => templeReady, onSwipe: showCountdown });
    bindSwipeUp($('countdownScreen'), {
      canSwipe: () => hasState('to-countdown') && !hasState('to-gratitude'),
      onSwipe: showGratitude,
    });

    // With a mouse, dragging over an <img> starts the browser's native image drag, which
    // cancels the pointer gesture and kills the swipe. Block it.
    scene.addEventListener('dragstart', (event) => event.preventDefault());

    $('countdownBackButton').addEventListener('click', backToCountdown);
    $('lampTarget').addEventListener('click', lightLamp, { once: true });
  })();

  /* ---- Boot ------------------------------------------------------------- */

  buildFlames();
})();
