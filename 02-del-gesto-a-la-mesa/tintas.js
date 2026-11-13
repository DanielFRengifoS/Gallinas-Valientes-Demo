'use strict';
(function () {
  var M = window.GyvMotion;
  if (!M) return;

  var root = document.querySelector('#tintas');
  if (!root) return;

  var sq = root.querySelector('#squeegee');
  var layers = {
    y: root.querySelector('.ink-y'),
    p: root.querySelector('.ink-p'),
    k: root.querySelector('.ink-k'),
    trueL: root.querySelector('.ink-true'),
    base: root.querySelector('.ink-base')
  };
  var wipe = root.querySelector('.wipe');
  var wipeEdge = root.querySelector('.wipe-edge');
  var riY = root.querySelector('.ri-y');
  var riP = root.querySelector('.ri-p');
  var riK = root.querySelector('.ri-k');
  var proofNum = root.querySelector('#proof-num');
  var capLabel = root.querySelector('#tintas-cap-label');
  var pasar = root.querySelector('.pasar-tinta');
  var nueva = root.querySelector('.nueva-prueba');
  var viewBtns = [].slice.call(root.querySelectorAll('[data-house]'));

  sq.hidden = false;

  var progress = 0; // 0..1 across three passes + register
  // 0-0.33 yellow, 0.33-0.66 pink, 0.66-0.9 plum, 0.9-1 register+true
  var proof = 1;
  var view = 'room';
  var cancel = null;

  var srcs = {
    room: { src: 'assets/sala.webp', srcset: 'assets/sala-640.webp 640w, assets/sala.webp 1350w', label: 'La sala', alt: 'Mesa de madera puesta junto a un muro de ladrillo, con un paso abierto al fondo.' },
    crew: { src: 'assets/equipo.webp', srcset: 'assets/equipo-640.webp 640w, assets/equipo.webp 1350w', label: 'El equipo', alt: 'Tres integrantes del equipo, con delantales ocres, posan detrás de la encimera.' }
  };

  function setView(v) {
    view = v;
    root.dataset.view = v;
    viewBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.house === v));
    });
    var s = srcs[v];
    root.querySelectorAll('.tintas-paper img').forEach(function (img) {
      img.src = s.src;
      img.srcset = s.srcset;
    });
    var baseImg = layers.base.querySelector('img');
    baseImg.alt = s.alt;
    capLabel.textContent = s.label;
  }

  function passLabel(p) {
    if (p < 0.08) return 'Sin pasadas de tinta';
    if (p < 0.33) return 'Pasada 1: tinta amarilla';
    if (p < 0.66) return 'Pasada 2: tinta rosa';
    if (p < 0.9) return 'Pasada 3: tinta ciruela';
    if (p < 0.98) return 'Registrando tintas';
    return 'Prueba a color · Sancho / El Tiempo';
  }

  function clipFor(local) {
    // local 0..1 within a pass → wipe from left
    var pct = M.clamp(local, 0, 1) * 100;
    return 'inset(0 ' + (100 - pct) + '% 0 0)';
  }

  function render(p) {
    progress = M.clamp(p, 0, 1);
    root.dataset.pass = String(Math.round(progress * 100) / 100);

    var yL = M.clamp(progress / 0.33, 0, 1);
    var pL = M.clamp((progress - 0.33) / 0.33, 0, 1);
    var kL = M.clamp((progress - 0.66) / 0.24, 0, 1);
    var reg = M.clamp((progress - 0.9) / 0.1, 0, 1);

    layers.y.style.clipPath = clipFor(yL);
    layers.p.style.clipPath = clipFor(pL);
    layers.k.style.clipPath = clipFor(kL);

    // Misregistration until snap
    var mis = 1 - reg;
    layers.y.querySelector('img').style.transform = 'translate(' + (-6 * mis) + 'px,' + (-4 * mis) + 'px)';
    layers.p.querySelector('img').style.transform = 'translate(' + (5 * mis) + 'px,' + (3 * mis) + 'px)';
    layers.k.querySelector('img').style.transform = 'translate(' + (-3 * mis) + 'px,' + (5 * mis) + 'px)';

    riY.style.transform = 'translate(' + (-4 * mis) + 'px,' + (-3 * mis) + 'px)';
    riP.style.transform = 'translate(' + (5 * mis) + 'px,' + (2 * mis) + 'px)';
    riK.style.transform = 'translate(' + (-2 * mis) + 'px,' + (4 * mis) + 'px)';
    riY.style.opacity = riP.style.opacity = riK.style.opacity = String(0.3 + (1 - Math.abs(0.5 - progress) * 0.5) * 0.5);

    // True photo resolves after register
    layers.trueL.style.opacity = String(reg);
    layers.base.style.opacity = String(1 - reg * 0.85);

    // Squeegee position across bed
    var bed = root.querySelector('.tintas-paper').getBoundingClientRect().width || 1;
    sq.style.transform = 'translateX(' + (progress * 100) + '%)';
    // Bead color by pass
    var bead = sq.querySelector('.sq-bead');
    if (progress < 0.33) bead.style.background = 'linear-gradient(90deg,#f5c74e,transparent)';
    else if (progress < 0.66) bead.style.background = 'linear-gradient(90deg,#f4bed7,transparent)';
    else bead.style.background = 'linear-gradient(90deg,#3c2043,transparent)';
    bead.style.opacity = String(progress > 0.95 ? 0 : 0.85);

    wipe.style.opacity = String(progress > 0.02 && progress < 0.95 ? 0.55 : 0);
    wipeEdge.style.left = (progress * 100) + '%';

    sq.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    sq.setAttribute('aria-valuetext', passLabel(progress));

    var inkLabel = progress < 0.08 ? 'una tinta'
      : progress < 0.33 ? 'amarilla'
      : progress < 0.66 ? 'amarilla + rosa'
      : progress < 0.9 ? 'tres tintas'
      : 'a color';
    root.querySelector('.tintas-proof').innerHTML = 'Prueba <b id="proof-num">' + String(proof).padStart(2, '0') + '</b> · ' + inkLabel;
  }

  function goTo(target, dur) {
    if (cancel) cancel();
    cancel = M.tween({
      from: progress,
      to: target,
      duration: M.reduce ? 0 : (dur != null ? dur : 1100),
      ease: M.easeInOutQuart,
      onUpdate: render,
      onComplete: function (v) { render(v); cancel = null; }
    });
  }

  function nextPass() {
    if (progress < 0.3) goTo(0.33);
    else if (progress < 0.63) goTo(0.66);
    else if (progress < 0.88) goTo(0.9);
    else goTo(1, 700);
  }

  pasar.addEventListener('click', nextPass);
  nueva.addEventListener('click', function () {
    proof += 1;
    goTo(0, 400);
  });

  viewBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      setView(b.dataset.house);
      // keep current ink progress on new subject
      render(progress);
    });
  });

  var startP = 0;
  M.drag(sq, {
    axis: 'x',
    threshold: 4,
    onStart: function () {
      if (cancel) cancel();
      startP = progress;
    },
    onMove: function (dx) {
      var w = root.querySelector('.tintas-paper').getBoundingClientRect().width || 1;
      render(M.clamp(startP + dx / w, 0, 1));
    },
    onEnd: function () {
      // snap to nearest pass end
      var snaps = [0, 0.33, 0.66, 0.9, 1];
      var best = 0, dist = 99;
      snaps.forEach(function (s) {
        var d = Math.abs(s - progress);
        if (d < dist) { dist = d; best = s; }
      });
      goTo(best, 360);
    }
  });

  sq.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); nextPass(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (progress > 0.9) goTo(0.9);
      else if (progress > 0.66) goTo(0.66);
      else if (progress > 0.33) goTo(0.33);
      else goTo(0);
    }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextPass(); }
  });

  setView('room');
  render(0);
})();
