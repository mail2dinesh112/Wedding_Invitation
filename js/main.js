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
    // If a flame sits off its wick, nudge x / y and open index.html#tune to check.
    flames: [
      { x: 49.9, y: 43.1, size: 1,    delay: .2,  flicker: 1.1, offset: -.2 },
      { x: 42.8, y: 43.2, size: 1.15, delay: .65, flicker: 1.7, offset: -.9 },
      { x: 56.9, y: 43.2, size: 1.05, delay: .85, flicker: 1.4, offset: -.5 },
      { x: 37.9, y: 43.5, size: 1,    delay: 1.2, flicker: 1.9, offset: -1.3 },
      { x: 61.8, y: 43.8, size: .8,   delay: 1.4, flicker: 1.5, offset: -.7 },
    ],

    embers: { max: 5, firstDelay: 1200, minGap: 900, maxGap: 2100 },
  };

  const TEXT = {
    lit: 'குத்துவிளக்கு ஏற்றப்பட்டது',
    hero: 'Welcome to the wedding of Dineshkumar and Suthesi',
    temple: 'குமாரவயலூர் அருள்மிகு திருக்கோயில்',
    countdown: 'திருமண நாளை நோக்கி',
    gratitude: 'தங்கள் வருகையை அன்புடன் எதிர்நோக்குகிறோம்',
  };

  /* ---- Helpers ---------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timing = reduceMotion ? CONFIG.timing.reduced : CONFIG.timing.full;

  const scene = $('scene');
  const statusEl = $('status');
  const bgm = $('bgm');
  const announce = (message) => { statusEl.textContent = message; };

  if (window.CSS && CSS.registerProperty && !reduceMotion) scene.classList.add('has-bloom');

  /* ---- Lamp: flames & embers ------------------------------------------- */

  function buildFlames() {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const container = $('flames');

    for (const f of CONFIG.flames) {
      const flame = document.createElement('div');
      flame.className = 'flame';
      flame.style.cssText =
        `--x:${f.x}%;--y:${f.y}%;--s:${f.size};--d:${f.delay}s;--fd:${f.flicker}s;--fo:${f.offset}s`;

      const halo = document.createElement('i');
      halo.className = 'halo';

      const sway = document.createElement('div');
      sway.className = 'sway';

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'core');
      svg.setAttribute('viewBox', '0 0 20 40');
      const use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#flame-shape');
      use.setAttribute('fill', 'url(#fg)');
      svg.append(use);

      sway.append(svg);
      flame.append(halo, sway);
      container.append(flame);
    }
  }

  const embers = (() => {
    const layer = $('embers');
    const stage = $('stage');
    const { max, firstDelay, minGap, maxGap } = CONFIG.embers;
    const rand = (min, span) => min + Math.random() * span;
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
        el.style.setProperty('--edx', `${((Math.random() - .5) * 30).toFixed(0)}px`);
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
    const units = Object.fromEntries(
      [...document.querySelectorAll('[data-unit]')].map((el) => [el.dataset.unit, el])
    );
    const pad = (n) => String(n).padStart(2, '0');
    let interval = null;

    function render() {
      const total = Math.max(0, CONFIG.weddingTime - Date.now());
      units.days.textContent = pad(Math.floor(total / 864e5));
      units.hours.textContent = pad(Math.floor(total % 864e5 / 36e5));
      units.minutes.textContent = pad(Math.floor(total % 36e5 / 6e4));
      units.seconds.textContent = pad(Math.floor(total % 6e4 / 1e3));
      if (total === 0) stop();
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
      if (!scene.classList.contains('to-countdown')) return;
      if (document.hidden) stop(); else start();
    });

    return { start };
  })();

  /* ---- Scratch-to-reveal tiles ----------------------------------------- */

  function createScratchSurface(surface) {
    const REVEAL_RATIO = .5;       // fraction of cleared pixels that completes a tile
    const BRUSH_PX = 24;
    const CHECK_EVERY_MS = 150;

    const canvas = surface.querySelector('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Unable to initialize the countdown scratch surface.');

    let pointer = { down: false, last: null };
    let touched = false;
    let finished = false;
    let lastCheck = 0;

    function paintCover() {
      const { width, height } = surface.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#80543a');
      gradient.addColorStop(.5, '#4d2921');
      gradient.addColorStop(1, '#74472f');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = i % 3 ? 'rgba(255,255,255,.08)' : 'rgba(240,207,147,.22)';
        ctx.beginPath();
        ctx.arc((i * 31.7) % width, (i * 23.1) % height, i % 4 === 0 ? 1 : .55, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(236,205,151,.72)';
      ctx.lineWidth = 1;
      ctx.strokeRect(5.5, 5.5, width - 11, height - 11);
    }

    function reveal() {
      finished = true;
      surface.classList.add('done');
      $('weddingDateReveal').hidden = false;
      const instruction = $('scratchInstruction');
      if (instruction &&
          [...document.querySelectorAll('.temple-timer-scratch')].every((tile) => tile.classList.contains('done'))) {
        instruction.classList.add('complete');
      }
    }

    function clearedFraction() {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      let samples = 0;
      for (let i = 3; i < pixels.length; i += 48) {   // sample every 12th pixel's alpha
        samples++;
        if (pixels[i] < 80) clear++;
      }
      return samples ? clear / samples : 0;
    }

    function checkProgress(force = false) {
      const now = performance.now();
      if (finished || (!force && now - lastCheck < CHECK_EVERY_MS)) return;
      lastCheck = now;
      if (clearedFraction() >= REVEAL_RATIO) reveal();
    }

    function localPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function erase(event) {
      const point = localPoint(event);
      const { last } = pointer;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.lineWidth = BRUSH_PX;

      ctx.beginPath();
      if (last) {
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      } else {
        ctx.arc(point.x, point.y, BRUSH_PX / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      pointer.last = point;
      touched = true;
      $('weddingDateReveal').hidden = false;
      checkProgress();
    }

    const release = () => {
      if (pointer.down) checkProgress(true);
      pointer = { down: false, last: null };
    };

    surface.addEventListener('pointerdown', (event) => {
      if (finished) return;
      pointer = { down: true, last: null };
      surface.setPointerCapture(event.pointerId);
      erase(event);
    });
    surface.addEventListener('pointermove', (event) => {
      if (pointer.down && !finished) erase(event);
    });
    surface.addEventListener('pointerup', release);
    surface.addEventListener('pointercancel', release);

    // Keyboard users can't scratch, so Enter / Space reveals the tile.
    surface.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      reveal();
    });

    paintCover();

    return {
      // Resizing a canvas clears it, so only repaint a cover nobody has scratched yet.
      onResize() { if (!finished && !touched) paintCover(); },
    };
  }

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

    function fit() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

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
          x: Math.random() * width,
          y: -12 - Math.random() * height * .25,
          vx: (Math.random() - .5) * .7,
          vy: Math.random() * 1.1,
          size: 5 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - .5) * .07,
          flip: Math.random() * Math.PI,
          flipSpeed: .02 + Math.random() * .05,
          phase: Math.random() * Math.PI * 2,
          color: COLORS[i % COLORS.length],
        });
      }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function shower() {
      burst();
    }

    $('petalButton').addEventListener('click', shower);
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
    const SVG_NS = 'http://www.w3.org/2000/svg';
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

  /* ---- Screen flow ------------------------------------------------------ */

  (() => {
    const heroScreen = $('hero');
    const heroSwipeHint = $('heroSwipeHint');
    const templeScreen = $('templeScreen');
    const countdownScreen = $('countdownScreen');
    const countdownSwipeHint = $('countdownSwipeHint');
    const swipeHint = $('templeSwipeHint');
    let templeReady = false;
    let templeStarted = false;
    let scratchSurfaces = null;

    function makeHeroPetals(count = 18) {
      const layer = $('heroPetals');
      layer.replaceChildren();

      if (reduceMotion) return;

      for (let i = 0; i < count; i++) {
        const petal = document.createElement('span');
        const size = 6 + Math.random() * 8;
        petal.className = 'hero-petal';
        petal.style.width = `${size}px`;
        petal.style.height = `${size * .8}px`;
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.setProperty('--petal-drift', `${Math.random() * 80 - 40}px`);
        petal.style.animationDuration = `${9 + Math.random() * 8}s`;
        petal.style.animationDelay = `${6 + Math.random() * 10}s`;
        layer.append(petal);
      }
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
      if (!templeReady || scene.classList.contains('to-countdown')) return;
      scene.classList.add('to-countdown');
      announce(TEXT.countdown);
      scratchSurfaces = [...document.querySelectorAll('.temple-timer-scratch')].map(createScratchSurface);
      countdown.start();
    }

    function showGratitude() {
      if (!scene.classList.contains('to-countdown')) return;
      const firstVisit = !scene.classList.contains('seen-gratitude');
      scene.classList.add('to-gratitude', 'seen-gratitude');
      announce(TEXT.gratitude);
      if (firstVisit) petals.welcome();
    }

    function backToCountdown() {
      scene.classList.remove('to-gratitude');
      announce(TEXT.countdown);
    }

    function lightLamp() {
      scene.classList.add('is-lit');
      $('lampTarget').disabled = true;
      announce(TEXT.lit);
      bgm.currentTime = 0;
      bgm.play().catch((error) => console.warn('Background music could not start:', error));
      try { navigator.vibrate?.(30); } catch { /* vibration is optional */ }
      if (!reduceMotion) embers.start();
      setTimeout(showHero, timing.lampToHero);
    }

    /* Swipe up (touch / pen / mouse drag) or scroll down on the temple screen → countdown.
       .temple-screen is touch-action:none, so pointer events cover every input type. */
    let swipeStartY = null;
    const isInteractive = (target) =>
      target instanceof Element && target.closest('a, button, [role="button"]');
    const isScratchSurface = (target) =>
      target instanceof Element && target.closest('.temple-timer-scratch');
    const canStartSwipe = (target) =>
      !isInteractive(target) ||
      (target instanceof Element &&
        target.closest('.hero-swipe-hint, .temple-swipe-hint, .countdown-swipe-hint')) ||
      isScratchSurface(target);

    let heroSwipeStartY = null;
    let heroTouchStartY = null;

    function heroCanSwipe() {
      return scene.classList.contains('to-hero') && !scene.classList.contains('to-temple');
    }

    heroScreen.addEventListener('pointerdown', (event) => {
      heroSwipeStartY = heroCanSwipe() && canStartSwipe(event.target) ? event.clientY : null;
      if (heroSwipeStartY !== null) {
        try { heroScreen.setPointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
      }
    });
    heroScreen.addEventListener('pointermove', (event) => {
      if (heroSwipeStartY !== null &&
          event.clientY - heroSwipeStartY < -CONFIG.swipeThresholdPx) {
        heroSwipeStartY = null;
        showTemple();
      }
    });
    heroScreen.addEventListener('pointerup', (event) => {
      if (heroSwipeStartY !== null &&
          event.clientY - heroSwipeStartY < -CONFIG.swipeThresholdPx) showTemple();
      heroSwipeStartY = null;
    });
    heroScreen.addEventListener('pointercancel', () => { heroSwipeStartY = null; });

    heroScreen.addEventListener('touchstart', (event) => {
      heroTouchStartY = heroCanSwipe() && canStartSwipe(event.target)
        ? event.changedTouches[0].clientY
        : null;
    }, { passive: true });
    heroScreen.addEventListener('touchmove', (event) => {
      if (heroTouchStartY !== null &&
          event.changedTouches[0].clientY - heroTouchStartY < -CONFIG.swipeThresholdPx) {
        heroTouchStartY = null;
        showTemple();
      }
    }, { passive: true });
    heroScreen.addEventListener('touchend', (event) => {
      if (heroTouchStartY !== null &&
          event.changedTouches[0].clientY - heroTouchStartY < -CONFIG.swipeThresholdPx) showTemple();
      heroTouchStartY = null;
    }, { passive: true });
    heroScreen.addEventListener('wheel', (event) => {
      if (heroCanSwipe() && event.deltaY > CONFIG.wheelThreshold) showTemple();
    }, { passive: true });

    templeScreen.addEventListener('pointerdown', (event) => {
      swipeStartY = templeReady && canStartSwipe(event.target) ? event.clientY : null;
      if (swipeStartY !== null) {
        try { templeScreen.setPointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
      }
    });
    templeScreen.addEventListener('pointermove', (event) => {
      if (swipeStartY !== null && event.clientY - swipeStartY < -CONFIG.swipeThresholdPx) {
        swipeStartY = null;
        showCountdown();
      }
    });
    templeScreen.addEventListener('pointerup', (event) => {
      if (swipeStartY !== null &&
          event.clientY - swipeStartY < -CONFIG.swipeThresholdPx) showCountdown();
      swipeStartY = null;
    });
    templeScreen.addEventListener('pointercancel', () => { swipeStartY = null; });
    templeScreen.addEventListener('wheel', (event) => {
      if (event.deltaY > CONFIG.wheelThreshold) showCountdown();
    }, { passive: true });

    let countdownSwipeStartY = null;
    let countdownTouchStartY = null;

    function countdownCanSwipe() {
      return scene.classList.contains('to-countdown') && !scene.classList.contains('to-gratitude');
    }

    function countdownSwipeThreshold(target) {
      return target instanceof Element && target.closest('.countdown-swipe-hint')
        ? 20
        : CONFIG.swipeThresholdPx;
    }

    let countdownHintSwipeStartY = null;
    countdownSwipeHint.addEventListener('pointerdown', (event) => {
      countdownHintSwipeStartY = countdownCanSwipe() ? event.clientY : null;
      if (countdownHintSwipeStartY !== null) {
        try { countdownSwipeHint.setPointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
      }
    });
    countdownSwipeHint.addEventListener('pointermove', (event) => {
      if (countdownHintSwipeStartY !== null &&
          event.clientY - countdownHintSwipeStartY < -20) {
        countdownHintSwipeStartY = null;
        showGratitude();
      }
    });
    countdownSwipeHint.addEventListener('pointerup', (event) => {
      if (countdownHintSwipeStartY !== null &&
          event.clientY - countdownHintSwipeStartY < -20) showGratitude();
      countdownHintSwipeStartY = null;
    });
    countdownSwipeHint.addEventListener('pointercancel', () => { countdownHintSwipeStartY = null; });

    countdownScreen.addEventListener('pointerdown', (event) => {
      countdownSwipeStartY = countdownCanSwipe() && canStartSwipe(event.target) &&
        !countdownSwipeHint.contains(event.target)
        ? { y: event.clientY, threshold: countdownSwipeThreshold(event.target) }
        : null;
      if (countdownSwipeStartY !== null && !isScratchSurface(event.target)) {
        try { countdownScreen.setPointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
      }
    });
    countdownScreen.addEventListener('pointermove', (event) => {
      if (countdownSwipeStartY !== null &&
          event.clientY - countdownSwipeStartY.y < -countdownSwipeStartY.threshold) {
        countdownSwipeStartY = null;
        showGratitude();
      }
    });
    countdownScreen.addEventListener('pointerup', (event) => {
      if (countdownSwipeStartY !== null &&
          event.clientY - countdownSwipeStartY.y < -countdownSwipeStartY.threshold) showGratitude();
      countdownSwipeStartY = null;
    });
    countdownScreen.addEventListener('pointercancel', () => { countdownSwipeStartY = null; });

    countdownScreen.addEventListener('touchstart', (event) => {
      countdownTouchStartY = countdownCanSwipe() && canStartSwipe(event.target)
        ? { y: event.changedTouches[0].clientY, threshold: countdownSwipeThreshold(event.target) }
        : null;
    }, { passive: true });
    countdownScreen.addEventListener('touchmove', (event) => {
      if (countdownTouchStartY !== null &&
          event.changedTouches[0].clientY - countdownTouchStartY.y < -countdownTouchStartY.threshold) {
        countdownTouchStartY = null;
        showGratitude();
      }
    }, { passive: true });
    countdownScreen.addEventListener('touchend', (event) => {
      if (countdownTouchStartY !== null &&
          event.changedTouches[0].clientY - countdownTouchStartY.y < -countdownTouchStartY.threshold) showGratitude();
      countdownTouchStartY = null;
    }, { passive: true });
    countdownScreen.addEventListener('touchcancel', () => { countdownTouchStartY = null; }, { passive: true });
    countdownScreen.addEventListener('wheel', (event) => {
      if (countdownCanSwipe() && event.deltaY > CONFIG.wheelThreshold && !isInteractive(event.target)) showGratitude();
    }, { passive: true });

    heroSwipeHint.addEventListener('click', showTemple);
    swipeHint.addEventListener('click', showCountdown);
    countdownSwipeHint.addEventListener('click', showGratitude);
    $('countdownBackButton').addEventListener('click', backToCountdown);
    $('lampTarget').addEventListener('click', lightLamp, { once: true });

    window.addEventListener('resize', () => scratchSurfaces?.forEach((s) => s.onResize()));
  })();

  /* ---- Boot ------------------------------------------------------------- */

  buildFlames();

  // index.html#tune outlines every flame so you can line them up with the wicks.
  if (location.hash === '#tune') scene.classList.add('is-lit', 'tune');
})();
