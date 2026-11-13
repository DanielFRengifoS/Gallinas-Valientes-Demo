'use strict';
(function () {
  document.documentElement.classList.add('js');
  var M = window.GyvMotion;
  if (!M) return;

  var hero = document.querySelector('.hero-figure');
  var scene = document.querySelector('#escena');
  var rig = scene.querySelector('.cam-rig');
  var plateLayer = scene.querySelector('.plate-layer');
  var rings = scene.querySelector('.plate-lines');
  var stamp = scene.querySelector('.scene-stamp');
  var label = scene.querySelector('.scene-label');
  var vf = scene.querySelector('.viewfinder');
  var plano = document.querySelector('#plano');
  var controls = hero.querySelector('.shot-controls');
  var nextBtn = hero.querySelector('.frame-toggle');
  var shotBtns = [].slice.call(hero.querySelectorAll('[data-shot]'));
  var regs = {
    tl: scene.querySelector('.r-tl'),
    tr: scene.querySelector('.r-tr'),
    bl: scene.querySelector('.r-bl'),
    br: scene.querySelector('.r-br')
  };

  controls.hidden = false;

  // Shots as continuous progress 0, 1, 2 — camera: tx%, ty%, scale, cut%, ring transform, plate layer
  var shots = [
    { // 01 La mano — spoon / finishing gesture upper
      name: '01 / 03 · La mano',
      tx: 8, ty: -18, sc: 1.55,
      cut: 14,
      ring: 'translate(28%, -22%) rotate(-38deg) scale(0.55)',
      plateOp: 0, plateSc: 0.7, plateX: 34, plateY: 40,
      stamp: 'translate(10%, -20%) rotate(28deg)',
      labelOp: 0,
      vfOp: 0.35
    },
    { // 02 El plato — plate rim lands under rings
      name: '02 / 03 · El plato',
      tx: 2, ty: 18, sc: 1.72,
      cut: 8,
      ring: 'translate(2%, 18%) rotate(0deg) scale(0.72)',
      plateOp: 0.95, plateSc: 1.05, plateX: 26, plateY: 48,
      stamp: 'translate(-4%, 8%) rotate(-6deg)',
      labelOp: 0.2,
      vfOp: 0.55
    },
    { // 03 La mesa — wider same photo
      name: '03 / 03 · La mesa',
      tx: 0, ty: 0, sc: 1.05,
      cut: 4,
      ring: 'translate(0,0) rotate(0deg) scale(1)',
      plateOp: 0, plateSc: 1, plateX: 28, plateY: 52,
      stamp: 'translate(0,0) rotate(-13deg)',
      labelOp: 1,
      vfOp: 0.15
    }
  ];

  var progress = 0; // 0..2 continuous
  var cancel = null;

  function mixShot(a, b, t) {
    var o = {};
    ['tx', 'ty', 'sc', 'cut', 'plateOp', 'plateSc', 'plateX', 'plateY', 'labelOp', 'vfOp'].forEach(function (k) {
      o[k] = M.lerp(a[k], b[k], t);
    });
    return o;
  }

  // Curved path: slight pull-back in the middle of each segment
  function easeCam(t) {
    // pull back then push in
    var pull = Math.sin(t * Math.PI) * 0.08;
    return { t: M.easeInOutQuart(t), pull: pull };
  }

  function sample(p) {
    var i0 = Math.floor(M.clamp(p, 0, 1.999));
    var i1 = Math.min(2, i0 + 1);
    var local = M.clamp(p - i0, 0, 1);
    var e = easeCam(local);
    var a = shots[i0];
    var b = shots[i1];
    var m = mixShot(a, b, e.t);
    m.sc = m.sc * (1 - e.pull);
    m.ring = a.ring; // swap ring string near mid
    m.stamp = a.stamp;
    m.name = local < 0.5 ? a.name : b.name;
    m.shotIndex = local < 0.5 ? i0 : i1;
    // Interpolate ring via style when crossing
    if (local > 0.01 && local < 0.99) {
      // use interpolated transform approx via scale/translate numbers already in m
      m.useRingLerp = true;
      m.ringFrom = a.ring;
      m.ringTo = b.ring;
      m.ringT = e.t;
      m.stampFrom = a.stamp;
      m.stampTo = b.stamp;
    } else {
      m.useRingLerp = false;
      m.ring = local < 0.5 ? a.ring : b.ring;
      m.stamp = local < 0.5 ? a.stamp : b.stamp;
    }
    return m;
  }

  function render(p) {
    progress = M.clamp(p, 0, 2);
    var s = sample(progress);
    hero.dataset.shot = String(s.shotIndex);
    scene.style.setProperty('--cut', s.cut + '%');

    rig.style.transform = 'translate(' + s.tx + '%,' + s.ty + '%) scale(' + s.sc + ')';

    // Plate depth layer — only visible near shot 1, covers its own original
    plateLayer.style.opacity = String(s.plateOp);
    plateLayer.style.left = s.plateX + '%';
    plateLayer.style.top = s.plateY + '%';
    plateLayer.style.transform = 'scale(' + s.plateSc + ')';
    // Move slightly faster than rig (parallax feel) — already absolute in scene

    if (s.useRingLerp) {
      // Crossfade two transforms isn't possible; prefer destination after mid
      rings.style.transform = s.ringT > 0.45 ? s.ringTo : s.ringFrom;
      rings.style.opacity = String(0.55 + Math.sin(s.ringT * Math.PI) * 0.35);
      stamp.style.transform = s.ringT > 0.45 ? s.stampTo : s.stampFrom;
    } else {
      rings.style.transform = s.ring;
      rings.style.opacity = '0.7';
      stamp.style.transform = s.stamp;
    }

    label.style.opacity = String(s.labelOp);
    vf.style.opacity = String(s.vfOp);

    // Registration marks fly to frame corners (viewfinder)
    var spread = 1 - Math.min(1, Math.abs((progress % 1) - 0.5) * 2);
    var inset = 5 + spread * 10;
    regs.tl.style.top = inset + 'px';
    regs.tl.style.left = inset + 'px';
    regs.tr.style.top = inset + 'px';
    regs.tr.style.right = inset + 'px';
    regs.bl.style.bottom = inset + 'px';
    regs.bl.style.left = inset + 'px';
    regs.br.style.bottom = inset + 'px';
    regs.br.style.right = inset + 'px';

    plano.textContent = s.name;

    var nearest = Math.round(progress);
    shotBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.shot) === nearest));
    });
  }

  function goTo(target, dur) {
    if (cancel) cancel();
    var from = progress;
    cancel = M.tween({
      from: from,
      to: target,
      duration: M.reduce ? 0 : (dur != null ? dur : 980),
      ease: M.easeInOutQuart,
      onUpdate: render,
      onComplete: function (v) { render(v); cancel = null; }
    });
  }

  shotBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      goTo(Number(btn.dataset.shot));
    });
  });

  nextBtn.addEventListener('click', function () {
    var n = (Math.round(progress) + 1) % 3;
    goTo(n);
  });

  var dragStart = 0;
  M.drag(scene, {
    axis: 'x',
    threshold: 10,
    onStart: function () {
      if (cancel) cancel();
      dragStart = progress;
    },
    onMove: function (dx) {
      var w = scene.getBoundingClientRect().width || 1;
      render(M.clamp(dragStart - dx / w * 1.4, 0, 2));
    },
    onEnd: function () {
      goTo(Math.round(progress), 420);
    }
  });

  scene.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(2, Math.round(progress) + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(0, Math.round(progress) - 1)); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(2); }
  });

  // House controls preserved
  var house = document.querySelector('.house-controls');
  if (house) {
    house.hidden = false;
    var hbtns = [].slice.call(house.querySelectorAll('button'));
    hbtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        hbtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        document.querySelector('.house-grid').dataset.focus = btn.dataset.key;
      });
    });
  }

  render(0);
})();
