/*! gyv-motion — lightweight springs, tweens, and axis-locked pointer drag.
   Local utility. No modules, no network. */
(function (global) {
  'use strict';

  var reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {}

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  /** Tween a number from → to over duration ms. Returns a cancel function. */
  function tween(opts) {
    var from = opts.from;
    var to = opts.to;
    var duration = Math.max(0, opts.duration || 0);
    var ease = opts.ease || easeOutCubic;
    var onUpdate = opts.onUpdate || function () {};
    var onComplete = opts.onComplete || function () {};
    var start = now();
    var raf = 0;
    var cancelled = false;

    if (reduce || duration === 0) {
      onUpdate(to, 1);
      onComplete(to);
      return function () {};
    }

    function frame(t) {
      if (cancelled) return;
      var p = clamp((t - start) / duration, 0, 1);
      var e = ease(p);
      var v = lerp(from, to, e);
      onUpdate(v, p);
      if (p < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        onComplete(to);
      }
    }
    raf = requestAnimationFrame(frame);
    return function cancel() {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }

  /** Spring toward a target. Call .setTarget(v) and .stop(). */
  function spring(opts) {
    var value = opts.value || 0;
    var target = opts.target != null ? opts.target : value;
    var velocity = 0;
    var stiffness = opts.stiffness || 180;
    var damping = opts.damping || 22;
    var precision = opts.precision || 0.001;
    var onUpdate = opts.onUpdate || function () {};
    var raf = 0;
    var running = false;
    var last = now();

    function step(t) {
      if (!running) return;
      var dt = Math.min(0.032, (t - last) / 1000);
      last = t;
      if (reduce) {
        value = target;
        velocity = 0;
        onUpdate(value, 0);
        running = false;
        return;
      }
      var force = (target - value) * stiffness;
      var damp = velocity * damping;
      velocity += (force - damp) * dt;
      value += velocity * dt;
      onUpdate(value, velocity);
      if (Math.abs(target - value) < precision && Math.abs(velocity) < precision) {
        value = target;
        velocity = 0;
        onUpdate(value, 0);
        running = false;
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      last = now();
      raf = requestAnimationFrame(step);
    }

    return {
      get value() { return value; },
      get target() { return target; },
      setTarget: function (v) {
        target = v;
        start();
      },
      setValue: function (v) {
        value = v;
        velocity = 0;
        onUpdate(value, 0);
      },
      impulse: function (v) {
        velocity += v;
        start();
      },
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      },
      isRunning: function () { return running; }
    };
  }

  /**
   * Axis-locked pointer drag.
   * opts.axis: 'x' | 'y' | 'angle'
   * opts.onStart, opts.onMove(delta, event), opts.onEnd(velocity)
   * For 'x'/'y': delta is pixels from start.
   * For 'angle': delta is radians from start (needs opts.centerEl).
   */
  function drag(el, opts) {
    var axis = opts.axis || 'x';
    var threshold = opts.threshold || 6;
    var onStart = opts.onStart || function () {};
    var onMove = opts.onMove || function () {};
    var onEnd = opts.onEnd || function () {};
    var active = false;
    var tracking = false;
    var startX = 0, startY = 0;
    var lastX = 0, lastY = 0;
    var lastT = 0;
    var vel = 0;
    var pid = null;

    function point(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function angleAt(p) {
      var rect = (opts.centerEl || el).getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      return Math.atan2(p.y - cy, p.x - cx);
    }

    function down(e) {
      if (e.button != null && e.button !== 0) return;
      var p = point(e);
      active = true;
      tracking = false;
      startX = lastX = p.x;
      startY = lastY = p.y;
      lastT = now();
      vel = 0;
      pid = e.pointerId != null ? e.pointerId : null;
      if (el.setPointerCapture && pid != null) {
        try { el.setPointerCapture(pid); } catch (err) {}
      }
      onStart(e);
    }

    function move(e) {
      if (!active) return;
      var p = point(e);
      var dx = p.x - startX;
      var dy = p.y - startY;
      if (!tracking) {
        if (axis === 'x' && Math.abs(dx) < threshold && Math.abs(dx) <= Math.abs(dy)) return;
        if (axis === 'y' && Math.abs(dy) < threshold && Math.abs(dy) <= Math.abs(dx)) return;
        if (axis === 'angle' && Math.hypot(dx, dy) < threshold) return;
        tracking = true;
      }
      if (e.cancelable) e.preventDefault();
      var t = now();
      var dt = Math.max(1, t - lastT);
      var delta;
      if (axis === 'x') {
        delta = dx;
        vel = (p.x - lastX) / dt * 1000;
      } else if (axis === 'y') {
        delta = dy;
        vel = (p.y - lastY) / dt * 1000;
      } else {
        delta = angleAt(p) - angleAt({ x: startX, y: startY });
        // unwrap
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        var aNow = angleAt(p);
        var aPrev = angleAt({ x: lastX, y: lastY });
        var da = aNow - aPrev;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        vel = da / dt * 1000;
      }
      lastX = p.x;
      lastY = p.y;
      lastT = t;
      onMove(delta, e, { x: p.x, y: p.y, dx: dx, dy: dy });
    }

    function up(e) {
      if (!active) return;
      active = false;
      if (el.releasePointerCapture && pid != null) {
        try { el.releasePointerCapture(pid); } catch (err) {}
      }
      onEnd(tracking ? vel : 0, e);
      tracking = false;
      pid = null;
    }

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    // touch fallback for older engines
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);

    return function destroy() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', up);
      el.removeEventListener('touchcancel', up);
    };
  }

  /** Pause a callback loop when element is offscreen. */
  function whenVisible(el, onVis, onHid) {
    if (!('IntersectionObserver' in window)) {
      if (onVis) onVis();
      return function () {};
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { if (onVis) onVis(); }
        else { if (onHid) onHid(); }
      });
    }, { threshold: 0.05 });
    io.observe(el);
    return function () { io.disconnect(); };
  }

  global.GyvMotion = {
    reduce: reduce,
    clamp: clamp,
    lerp: lerp,
    easeOutCubic: easeOutCubic,
    easeInOutQuart: easeInOutQuart,
    easeOutBack: easeOutBack,
    tween: tween,
    spring: spring,
    drag: drag,
    whenVisible: whenVisible,
    now: now
  };
})(typeof window !== 'undefined' ? window : this);
