'use strict';
(function () {
  document.documentElement.classList.add('js');
  var M = window.GyvMotion;
  if (!M) return;

  var frame = document.querySelector('.hero-scene');
  var photo = frame.querySelector('.photo-main');
  var trigger = frame.querySelector('.frame-toggle');
  var tab = frame.querySelector('.cut-tab');
  var paperTl = frame.querySelector('.paper-tl');
  var paperBr = frame.querySelector('.paper-br');
  var edgeTl = frame.querySelector('.cut-edge-tl');
  var edgeBr = frame.querySelector('.cut-edge-br');
  var line = frame.querySelector('.hero-line');
  var annA = frame.querySelector('.ann-a');
  var annB = frame.querySelector('.ann-b');
  var regs = frame.querySelectorAll('.reg');
  var halves = frame.querySelectorAll('.reg-half');

  trigger.hidden = false;
  tab.hidden = false;

  var open = 0; // 0 closed, 1 open
  var cancel = null;

  // Closed clip (gesto) → open clip (full same photo)
  var clipClosed = 'polygon(0 31%,32% 16%,100% 16%,100% 84%,77% 100%,0 100%)';
  var clipOpen = 'polygon(0 0,100% 0,100% 100%,0 100%)';

  function valuetext(v) {
    if (v < 0.2) return 'Corte cerrado sobre el gesto';
    if (v < 0.8) return 'Abriendo el corte del papel';
    return 'Plano abierto: la mesa, misma toma';
  }

  function render(v) {
    open = M.clamp(v, 0, 1);
    // Overshoot settle near end
    var e = open;
    frame.dataset.cut = String(Math.round(open * 100) / 100);
    frame.classList.toggle('open', open > 0.55);

    // Paper pieces separate at different speeds
    var tl = Math.pow(open, 0.85);
    var br = Math.pow(open, 1.15);
    paperTl.style.transform = 'translate(' + (-tl * 18) + '%,' + (-tl * 10) + '%) rotate(' + (-tl * 4) + 'deg)';
    paperBr.style.transform = 'translate(' + (br * 16) + '%,' + (br * 12) + '%) rotate(' + (br * 3) + 'deg)';
    paperTl.style.opacity = String(M.lerp(0.92, 0.35, open));
    paperBr.style.opacity = String(M.lerp(0.92, 0.25, open));

    // Curl edges
    edgeTl.style.opacity = String(Math.sin(open * Math.PI) * 0.95);
    edgeBr.style.opacity = String(Math.sin(open * Math.PI) * 0.85);
    edgeTl.style.transform = 'rotate(-28deg) scaleX(' + M.lerp(0.4, 1.1, open) + ') translateY(' + (-open * 6) + 'px)';
    edgeBr.style.transform = 'rotate(-28deg) scaleX(' + M.lerp(0.4, 1.05, open) + ') translateY(' + (open * 4) + 'px)';
    edgeTl.style.boxShadow = '0 ' + (4 + open * 10) + 'px ' + (8 + open * 12) + 'px rgba(0,0,0,' + (0.2 + open * 0.25) + ')';

    // Photo counter-scale + clip morph (approximate via scale + clip)
    var sc = M.lerp(1.08, 1, open);
    photo.style.transform = 'translate(-50%,-50%) scale(' + sc + ')';
    // Blend clip via CSS variable approximate — use open clip with inset feel
    if (open < 0.02) photo.style.clipPath = clipClosed;
    else if (open > 0.98) photo.style.clipPath = clipOpen;
    else {
      // interpolate polygon points roughly
      var a = open;
      photo.style.clipPath = 'polygon(' +
        '0 ' + M.lerp(31, 0, a) + '%,' +
        M.lerp(32, 100, a) + '% ' + M.lerp(16, 0, a) + '%,' +
        '100% ' + M.lerp(16, 0, a) + '%,' +
        '100% ' + M.lerp(84, 100, a) + '%,' +
        M.lerp(77, 0, a) + '% 100%,' +
        '0 100%)';
    }

    // Lines drift at third speed
    line.style.transform = 'translateY(' + (-open * 18) + '%)';
    line.style.opacity = String(M.lerp(0.6, 0.28, open));

    // Annotations
    annA.style.opacity = String(1 - open);
    annA.style.transform = 'translateX(' + (-open * 12) + 'px)';
    annB.style.opacity = String(open);
    annB.style.transform = 'translateX(' + ((1 - open) * 12) + 'px)';

    // Registration: halves split then re-register as whole at corners
    var halfOp = Math.sin(open * Math.PI);
    halves.forEach(function (h) { h.style.opacity = String(halfOp * 0.9); });
    var regOp = open > 0.7 ? (open - 0.7) / 0.3 : 0;
    // slight overshoot settle
    var settle = open > 0.92 ? 1 + Math.sin((open - 0.92) / 0.08 * Math.PI) * 0.04 : 1;
    regs.forEach(function (r, i) {
      r.style.opacity = String(regOp);
      var ox = (i % 2 === 0 ? -1 : 1) * (1 - regOp) * 10;
      var oy = (i < 2 ? -1 : 1) * (1 - regOp) * 8;
      r.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + settle + ')';
    });

    // Tab rides the cut
    tab.style.left = M.lerp(42, 58, open) + '%';
    tab.style.top = M.lerp(48, 40, open) + '%';
    tab.setAttribute('aria-valuenow', String(Math.round(open * 100)));
    tab.setAttribute('aria-valuetext', valuetext(open));
    trigger.setAttribute('aria-pressed', String(open > 0.55));
    trigger.firstChild.nodeValue = open > 0.55 ? 'Cerrar el corte ' : 'Abrir el corte ';
    var icon = trigger.querySelector('span');
    if (icon) icon.textContent = open > 0.55 ? '⤡' : '⤢';
  }

  function goTo(target, dur) {
    if (cancel) cancel();
    cancel = M.tween({
      from: open,
      to: target,
      duration: M.reduce ? 0 : (dur != null ? dur : 900),
      ease: M.easeInOutQuart,
      onUpdate: render,
      onComplete: function (v) {
        // micro overshoot settle
        if (!M.reduce && target === 1) {
          cancel = M.tween({
            from: 1.03, to: 1, duration: 180, ease: M.easeOutCubic,
            onUpdate: function (x) { render(Math.min(1, x)); },
            onComplete: function () { render(1); cancel = null; }
          });
        } else {
          render(v);
          cancel = null;
        }
      }
    });
  }

  trigger.addEventListener('click', function () {
    goTo(open > 0.55 ? 0 : 1);
  });

  var startOpen = 0;
  M.drag(tab, {
    axis: 'x',
    threshold: 4,
    onStart: function () {
      tab.classList.add('is-dragging');
      if (cancel) cancel();
      startOpen = open;
    },
    onMove: function (dx, e, info) {
      // Project onto cut normal ~ angle -28deg
      var ang = -28 * Math.PI / 180;
      var nx = Math.cos(ang + Math.PI / 2);
      var ny = Math.sin(ang + Math.PI / 2);
      var proj = info.dx * nx + info.dy * ny;
      var w = frame.getBoundingClientRect().width || 1;
      render(M.clamp(startOpen + proj / (w * 0.55), 0, 1));
    },
    onEnd: function () {
      tab.classList.remove('is-dragging');
      goTo(open > 0.45 ? 1 : 0, 520);
    }
  });

  tab.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); goTo(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); goTo(0); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(open > 0.55 ? 0 : 1); }
  });

  // Menu index highlight (preserved)
  var index = [].slice.call(document.querySelectorAll('.menu-index a'));
  function markFamily() {
    index.forEach(function (link) {
      if (link.hash === location.hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', markFamily);
  markFamily();

  render(0);
})();
