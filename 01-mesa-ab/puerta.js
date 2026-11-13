'use strict';
(function () {
  var M = window.GyvMotion;
  if (!M) return;

  var scene = document.querySelector('#puerta');
  if (!scene) return;
  var leaf = document.querySelector('#puerta-leaf');
  var light = scene.querySelector('.puerta-light');
  var pass = scene.querySelector('.puerta-pass');
  var glassImgs = scene.querySelectorAll('.porthole-glass img');
  var pushBtn = scene.querySelector('.puerta-push');
  var stopBtn = scene.querySelector('.puerta-stop');
  var live = scene.querySelector('.puerta-live');
  var stopped = false;
  var dir = 1; // next impulse direction
  var maxAngle = 78; // degrees open toward camera / away

  var angle = 0; // 0 closed, positive opens (pass visible), negative other way

  function setVisual(a) {
    angle = a;
    var t = M.clamp(Math.abs(a) / maxAngle, 0, 1);
    var openSign = a >= 0 ? 1 : -1;
    leaf.style.transform = 'perspective(1100px) rotateY(' + (-a) + 'deg)';
    leaf.setAttribute('aria-valuenow', String(Math.round(t * 100)));
    var txt = t < 0.15 ? 'Puerta cerrada hacia el salón'
      : (t > 0.7 ? 'Puerta abierta al pase' : 'Puerta entreabierta');
    leaf.setAttribute('aria-valuetext', txt);
    live.textContent = t < 0.2 ? 'Salón' : (t > 0.65 ? 'Pase' : 'Entreabierta');

    light.style.opacity = String(t * 0.95);
    light.style.transform = 'scaleX(' + (0.35 + t * 0.9) + ')';

    pass.style.opacity = String(Math.pow(t, 0.85));
    pass.style.transform = 'scale(' + M.lerp(0.96, 1, t) + ')';

    // Porthole parallax — glass shows pass sliding
    var shift = openSign * t * 18;
    glassImgs.forEach(function (img, i) {
      var mirror = i === 1 ? -1 : 1;
      img.style.transform = 'translate(calc(-12% + ' + (shift * mirror) + 'px), -8%)' + (i === 1 ? ' scaleX(-1)' : '');
    });

    // Push plate face
    var plates = leaf.querySelectorAll('.push-plate');
    // front says SALA when closed-ish, back PASE — already in HTML

    scene.dataset.open = String(Math.round(t * 100) / 100);
  }

  var spr = M.spring({
    value: 0,
    target: 0,
    stiffness: M.reduce ? 400 : 140,
    damping: M.reduce ? 40 : 16,
    precision: 0.05,
    onUpdate: function (v) { setVisual(v); }
  });

  function settleNear() {
    if (stopped) {
      // hold near fully open
      spr.setTarget(maxAngle * 0.92 * (angle >= 0 ? 1 : -1) || maxAngle * 0.92);
      return;
    }
    // Double-acting: settle closed unless flung open past threshold
    if (Math.abs(angle) > maxAngle * 0.55) {
      spr.setTarget(maxAngle * 0.88 * (angle >= 0 ? 1 : -1));
    } else {
      spr.setTarget(0);
    }
  }

  var startAngle = 0;
  M.drag(leaf, {
    axis: 'x',
    threshold: 4,
    onStart: function () {
      leaf.classList.add('is-dragging');
      startAngle = angle;
      spr.stop();
    },
    onMove: function (dx) {
      var w = leaf.getBoundingClientRect().width || 1;
      // drag right opens (positive)
      var next = M.clamp(startAngle + dx / w * maxAngle * 1.35, -maxAngle, maxAngle);
      spr.setValue(next);
      setVisual(next);
    },
    onEnd: function (vel) {
      leaf.classList.remove('is-dragging');
      // impulse from velocity
      var impulse = M.clamp(vel / 40, -80, 80);
      if (M.reduce) {
        settleNear();
        return;
      }
      spr.impulse(impulse);
      // retarget after a beat
      setTimeout(settleNear, 80);
    }
  });

  pushBtn.addEventListener('click', function () {
    if (stopped) {
      spr.setTarget(maxAngle * 0.92 * dir);
      dir *= -1;
      return;
    }
    if (M.reduce) {
      var tgt = Math.abs(angle) < 10 ? maxAngle * 0.9 * dir : 0;
      if (Math.abs(angle) >= 10) dir *= -1;
      spr.setTarget(tgt);
      return;
    }
    spr.impulse(dir * 95);
    dir *= -1;
    setTimeout(settleNear, 120);
  });

  stopBtn.addEventListener('click', function () {
    stopped = !stopped;
    stopBtn.setAttribute('aria-pressed', String(stopped));
    if (stopped) {
      spr.setTarget(maxAngle * 0.92);
    } else {
      settleNear();
    }
  });

  leaf.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      spr.setTarget(M.clamp(angle + 18, -maxAngle, maxAngle));
      setTimeout(settleNear, 200);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      spr.setTarget(M.clamp(angle - 18, -maxAngle, maxAngle));
      setTimeout(settleNear, 200);
    }
    if (e.key === 'Home') { e.preventDefault(); spr.setTarget(0); }
    if (e.key === 'End') { e.preventDefault(); spr.setTarget(maxAngle * 0.92); }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pushBtn.click();
    }
  });

  setVisual(0);
})();
