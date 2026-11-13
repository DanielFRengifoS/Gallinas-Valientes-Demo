'use strict';
(function () {
  var M = window.GyvMotion;
  if (!M) return;

  var menu = document.querySelector('.menu-layout');
  var disc = document.querySelector('#rueda-disc');
  var svg = disc.querySelector('.rueda-svg');
  var windowEl = disc.querySelector('.rueda-window');
  var headline = document.querySelector('.rueda-headline');
  var buttons = [].slice.call(document.querySelectorAll('.lens-controls button'));
  var motifs = {
    tortillas: disc.querySelector('.motif-tortillas'),
    compartir: disc.querySelector('.motif-compartir'),
    parrilla: disc.querySelector('.motif-parrilla')
  };

  var keys = ['tortillas', 'compartir', 'parrilla'];
  var labels = {
    tortillas: 'TORTILLAS',
    compartir: 'COMPARTIR',
    parrilla: 'PARRILLA'
  };
  // Angle offsets so each label lands under the top notch
  var detents = [0, 120, 240]; // degrees
  var angle = 0; // current rotation of rim
  var innerAngle = 0;
  var velocity = 0;
  var raf = 0;
  var index = 0;
  var cancelPeel = null;

  function setHeadline(key, animate) {
    var text = labels[key];
    headline.innerHTML = '';
    text.split('').forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'peel-letter';
      span.dataset.i = String(i);
      span.textContent = ch;
      span.style.transform = animate && !M.reduce
        ? 'rotate(' + (ch === ' ' ? 0 : -70) + 'deg) translateY(12px)'
        : 'none';
      span.style.opacity = animate && !M.reduce ? '0' : '1';
      headline.appendChild(span);
    });
    if (animate && !M.reduce) {
      var letters = [].slice.call(headline.querySelectorAll('.peel-letter'));
      letters.forEach(function (el, i) {
        M.tween({
          from: 0, to: 1,
          duration: 380,
          ease: M.easeOutBack,
          onUpdate: function (v) {
            // stagger via delay approximation: start later
          }
        });
        setTimeout(function () {
          M.tween({
            from: 0, to: 1, duration: 420, ease: M.easeOutBack,
            onUpdate: function (v) {
              el.style.opacity = String(v);
              el.style.transform = 'rotate(' + M.lerp(-70, 0, v) + 'deg) translateY(' + M.lerp(12, 0, v) + 'px)';
            },
            onComplete: function () {
              el.style.opacity = '1';
              el.style.transform = 'none';
            }
          });
        }, i * 38);
      });
    }
  }

  function applyFamily(key, animate) {
    index = keys.indexOf(key);
    menu.dataset.family = key;
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.key === key));
    });
    Object.keys(motifs).forEach(function (k) {
      motifs[k].style.opacity = k === key ? '1' : '0';
    });
    disc.setAttribute('aria-valuenow', String(index));
    disc.setAttribute('aria-valuetext', labels[key]);
    setHeadline(key, animate !== false);
  }

  function nearestDetent(a) {
    // normalize 0..360
    var n = ((a % 360) + 360) % 360;
    var best = 0, dist = 999, bestKey = 0;
    detents.forEach(function (d, i) {
      var dd = Math.abs(n - d);
      if (dd > 180) dd = 360 - dd;
      if (dd < dist) { dist = dd; best = d; bestKey = i; }
    });
    return { angle: best, index: bestKey };
  }

  function renderAngle(a) {
    angle = a;
    innerAngle = -a * 0.42; // geared differently
    svg.style.transform = 'rotate(' + angle + 'deg)';
    windowEl.style.transform = 'translate(-50%,-50%) rotate(' + innerAngle + 'deg)';
  }

  function spinTo(targetAngle, thenKey) {
    var from = angle;
    // shortest path
    var to = targetAngle;
    var diff = to - from;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    M.tween({
      from: 0, to: 1,
      duration: M.reduce ? 0 : 700,
      ease: M.easeOutCubic,
      onUpdate: function (t) {
        renderAngle(from + diff * t);
      },
      onComplete: function () {
        renderAngle(to);
        applyFamily(keys[thenKey], true);
      }
    });
  }

  function settle() {
    var n = nearestDetent(angle);
    spinTo(n.angle, n.index);
  }

  // Inertia loop after flick
  function inertia() {
    if (M.reduce) { settle(); return; }
    function step() {
      angle += velocity * 0.016 * 60;
      velocity *= 0.94;
      renderAngle(angle);
      if (Math.abs(velocity) < 0.4) {
        settle();
        return;
      }
      raf = requestAnimationFrame(step);
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }

  var startAng = 0;
  M.drag(disc, {
    axis: 'angle',
    centerEl: disc,
    threshold: 4,
    onStart: function () {
      disc.classList.add('is-dragging');
      cancelAnimationFrame(raf);
      startAng = angle;
      velocity = 0;
    },
    onMove: function (delta) {
      // delta in radians
      renderAngle(startAng + delta * 180 / Math.PI);
    },
    onEnd: function (vel) {
      disc.classList.remove('is-dragging');
      // vel in rad/s approx
      velocity = vel * 180 / Math.PI * 0.02;
      if (Math.abs(velocity) > 2) inertia();
      else settle();
    }
  });

  // Also allow horizontal drag feel
  // (angle drag already covers)

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.key;
      var i = keys.indexOf(key);
      spinTo(detents[i], i);
    });
  });

  disc.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      var ni = (index + 1) % 3;
      spinTo(detents[ni], ni);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      var pi = (index + 2) % 3;
      spinTo(detents[pi], pi);
    }
    if (e.key === 'Home') { e.preventDefault(); spinTo(0, 0); }
    if (e.key === 'End') { e.preventDefault(); spinTo(240, 2); }
  });

  // Rim label tap via buttons only (SVG textPath hard to hit); OK

  renderAngle(0);
  applyFamily('tortillas', false);
})();
