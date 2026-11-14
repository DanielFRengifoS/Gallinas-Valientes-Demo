'use strict';
(function () {
  document.documentElement.classList.add('js');
  var M = window.GyvMotion;
  if (!M) return;

  var hero = document.querySelector('#portada');
  var stage = document.querySelector('#platos');
  var tortilla = stage.querySelector('.tortilla');
  var remolacha = stage.querySelector('.remolacha');
  var tagA = stage.querySelector('.tag-a');
  var tagB = stage.querySelector('.tag-b');
  var midLabel = stage.querySelector('.mid-label');
  var placemat = stage.querySelector('.placemat');
  var seam = stage.querySelector('.seam');
  var orbitA = stage.querySelector('.orbit-a');
  var orbitB = stage.querySelector('.orbit-b');
  var fork = stage.querySelector('.fork');
  var knife = stage.querySelector('.knife');
  var buttons = [].slice.call(document.querySelectorAll('.switch button'));
  var rail = document.querySelector('.rail');
  var railFill = rail.querySelector('.rail-fill');
  var railThumb = rail.querySelector('.rail-thumb');

  var p = 0;
  var cancelTween = null;
  var dragging = false;

  // Keyframes: left%, top%, width%, rotate deg, frameRadius (0=rect,1=arch), z
  var A0 = { l: 7, t: 6, w: 47, r: -4, fr: 0, z: 3, sc: 1 };
  var A1 = { l: 6, t: 26, w: 32, r: -8, fr: 0.85, z: 1, sc: 0.92 };
  var B0 = { l: 57, t: 22, w: 37, r: 6, fr: 1, z: 2, sc: 0.94 };
  var B1 = { l: 44, t: 4, w: 47, r: 3, fr: 0, z: 3, sc: 1 };
  // Midpoint art-directed — equal presence
  var Am = { l: 10, t: 14, w: 40, r: -3, fr: 0.15, z: 3, sc: 1 };
  var Bm = { l: 50, t: 14, w: 40, r: 3, fr: 0.15, z: 3, sc: 1 };

  function mixKey(a, m, b, t) {
    // Piecewise: 0→0.5 a→m, 0.5→1 m→b
    var from, to, local;
    if (t <= 0.5) {
      from = a; to = m; local = t / 0.5;
    } else {
      from = m; to = b; local = (t - 0.5) / 0.5;
    }
    // ease through crossing so depth swap softens
    var e = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
    var o = {};
    Object.keys(from).forEach(function (k) {
      o[k] = M.lerp(from[k], to[k], e);
    });
    return o;
  }

  function applyPlate(el, k) {
    el.style.left = k.l + '%';
    el.style.top = k.t + '%';
    el.style.width = k.w + '%';
    el.style.transform = 'rotate(' + k.r + 'deg) scale(' + k.sc + ')';
    el.style.zIndex = String(Math.round(k.z * 10));
    var frame = el.querySelector('.plate-frame');
    var rad = M.lerp(3, 49, k.fr);
    frame.style.borderRadius = rad + '% ' + rad + '% 5px 5px';
    var cap = el.querySelector('figcaption');
    cap.style.transform = 'rotate(' + (-k.r) + 'deg)';
    // depth veil via shadow / opacity
    var depth = (k.z - 1) / 2;
    frame.style.boxShadow = '0 ' + M.lerp(4, 14, depth) + 'px ' + M.lerp(12, 32, depth) + 'px rgba(56,22,40,' + M.lerp(0.18, 0.38, depth) + ')';
    el.style.filter = 'brightness(' + M.lerp(0.86, 1, depth) + ')';
  }

  function valuetext(v) {
    if (v < 0.25) return 'Tortilla vaga en primer plano';
    if (v < 0.75) return 'Al centro de la mesa';
    return 'Carpaccio de remolacha en primer plano';
  }

  function render(v) {
    p = M.clamp(v, 0, 1);
    hero.dataset.p = String(Math.round(p * 100) / 100);
    hero.dataset.focus = p < 0.5 ? 'tortilla' : 'remolacha';
    if (Math.abs(p - 0.5) < 0.08) hero.dataset.focus = 'centro';

    var ka = mixKey(A0, Am, A1, p);
    var kb = mixKey(B0, Bm, B1, p);
    // Cross z at mid so they never pop: when p near 0.5 both high
    if (p > 0.35 && p < 0.65) {
      ka.z = 3; kb.z = 3.2;
      if (p > 0.5) { ka.z = 2.8; kb.z = 3.2; }
      else { ka.z = 3.2; kb.z = 2.8; }
    }
    applyPlate(tortilla, ka);
    applyPlate(remolacha, kb);

    // Surface color
    var bg = p < 0.5
      ? 'color-mix(in srgb, #ffcf77 ' + ((1 - p * 2) * 100) + '%, #f1c5bd)'
      : 'color-mix(in srgb, #f1c5bd ' + ((p - 0.5) * 2 * 100) + '%, #ffcf77)';
    // Fallback without color-mix
    stage.style.background = p < 0.5
      ? 'rgb(' + Math.round(M.lerp(255, 241, p * 2)) + ',' + Math.round(M.lerp(207, 197, p * 2)) + ',' + Math.round(M.lerp(119, 189, p * 2)) + ')'
      : 'rgb(' + Math.round(M.lerp(241, 255, (p - 0.5) * 2)) + ',' + Math.round(M.lerp(197, 207, (p - 0.5) * 2)) + ',' + Math.round(M.lerp(189, 119, (p - 0.5) * 2)) + ')';

    // Tags swap emphasis
    tagA.style.opacity = String(M.lerp(1, 0.36, p));
    tagB.style.opacity = String(M.lerp(0.36, 1, p));
    tagA.style.transform = 'translateX(' + M.lerp(0, -0.15, p) + 'em)';
    tagB.style.transform = 'translateX(' + M.lerp(-0.27, 0, p) + 'em)';
    stage.querySelector('.stage-tag').style.transform =
      'translateX(' + M.lerp(0, -0.25, p) + 'em) rotate(' + M.lerp(0, -12, p) + 'deg)';

    // Mid label
    var mid = 1 - Math.min(1, Math.abs(p - 0.5) / 0.18);
    midLabel.hidden = mid < 0.05;
    midLabel.style.opacity = String(mid);

    // Tabletop graphics
    if (orbitA) orbitA.setAttribute('transform', 'rotate(' + (-15 + p * 18) + ' 320 247)');
    if (orbitB) orbitB.setAttribute('transform', 'rotate(' + (27 - p * 14) + ' 320 247) scale(' + (1 + p * 0.08) + ')');
    if (placemat) {
      placemat.setAttribute('cx', String(M.lerp(220, 420, p)));
      placemat.setAttribute('cy', String(M.lerp(260, 240, p)));
      placemat.setAttribute('opacity', String(M.lerp(0.35, 0.28, Math.abs(p - 0.5) * 2)));
    }
    if (seam) {
      seam.setAttribute('opacity', String(mid * 0.55));
      seam.setAttribute('transform', 'translate(0 ' + M.lerp(0, -20, p) + ')');
    }
    if (fork) fork.setAttribute('transform', 'rotate(' + M.lerp(0, -18, p) + ' 92 200)');
    if (knife) knife.setAttribute('transform', 'rotate(' + M.lerp(0, 22, p) + ' 552 200)');

    // Rail
    var pct = p * 100;
    railFill.style.width = pct + '%';
    railThumb.style.left = pct + '%';
    rail.setAttribute('aria-valuenow', String(Math.round(pct)));
    rail.setAttribute('aria-valuetext', valuetext(p));

    // Buttons
    buttons.forEach(function (btn) {
      var tp = parseFloat(btn.dataset.p);
      var on = Math.abs(tp - p) < 0.12 || (tp === 0.5 && Math.abs(p - 0.5) < 0.15);
      // Prefer exact detent match after snap
      if (tp === 0) on = p < 0.25;
      if (tp === 0.5) on = p >= 0.25 && p <= 0.75;
      if (tp === 1) on = p > 0.75;
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function snapTarget(v) {
    var dets = [0, 0.5, 1];
    var best = 0, dist = 99;
    dets.forEach(function (d) {
      var dd = Math.abs(d - v);
      if (dd < dist) { dist = dd; best = d; }
    });
    return best;
  }

  function goTo(target, dur) {
    if (cancelTween) cancelTween();
    var duration = M.reduce ? 0 : (dur != null ? dur : 720);
    cancelTween = M.tween({
      from: p,
      to: target,
      duration: duration,
      ease: M.easeInOutQuart,
      onUpdate: render,
      onComplete: function (v) { render(v); cancelTween = null; }
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      goTo(parseFloat(btn.dataset.p));
    });
  });

  function plateActivate(el) {
    var key = el.dataset.plate;
    goTo(key === 'tortilla' ? 0 : 1);
  }
  [tortilla, remolacha].forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (dragging) return;
      e.preventDefault();
      plateActivate(el);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        plateActivate(el);
      }
    });
  });

  // Stage drag
  var dragStartP = 0;
  M.drag(stage, {
    axis: 'x',
    threshold: 8,
    onStart: function () {
      if (cancelTween) cancelTween();
      dragStartP = p;
      dragging = false;
    },
    onMove: function (dx) {
      dragging = true;
      stage.classList.add('is-dragging');
      var w = stage.getBoundingClientRect().width || 1;
      render(M.clamp(dragStartP + dx / w, 0, 1));
    },
    onEnd: function () {
      stage.classList.remove('is-dragging');
      goTo(snapTarget(p), 480);
      setTimeout(function () { dragging = false; }, 40);
    }
  });

  // Rail drag / click
  function railFromEvent(e) {
    var rect = rail.querySelector('.rail-track').getBoundingClientRect();
    var x = (e.clientX != null ? e.clientX : (e.touches && e.touches[0].clientX)) - rect.left;
    return M.clamp(x / rect.width, 0, 1);
  }
  var railDragging = false;
  rail.addEventListener('pointerdown', function (e) {
    railDragging = true;
    if (cancelTween) cancelTween();
    rail.setPointerCapture && rail.setPointerCapture(e.pointerId);
    render(railFromEvent(e));
  });
  rail.addEventListener('pointermove', function (e) {
    if (!railDragging) return;
    render(railFromEvent(e));
  });
  rail.addEventListener('pointerup', function () {
    if (!railDragging) return;
    railDragging = false;
    goTo(snapTarget(p), 420);
  });
  rail.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 0.5 : 0.1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); goTo(M.clamp(snapTarget(p + 0.01) === p ? p + step : snapTarget(p + step), 0, 1)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); goTo(M.clamp(p - step, 0, 1)); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(1); }
  });

  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(snapTarget(Math.min(1, p + 0.5))); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(snapTarget(Math.max(0, p - 0.5))); }
  });

  // Menu families select in place. Keep hrefs for direct links and the no-JS fallback.
  var menuSpread = document.querySelector('.menu-spread');
  var families = [].slice.call(menuSpread.querySelectorAll('.menu-index a'));
  function markFamily(hash) {
    families.forEach(function (link) {
      var active = link.hash === hash;
      var section = document.getElementById(link.hash.slice(1));
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      if (section) section.toggleAttribute('data-family-active', active);
    });
  }
  families.forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      markFamily(link.hash);
    });
  });
  window.addEventListener('hashchange', function () { markFamily(location.hash); });
  menuSpread.setAttribute('data-family-in-place', '');
  markFamily(location.hash);

  render(0);
})();
